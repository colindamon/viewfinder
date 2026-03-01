from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from collections import deque
import time
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from read_data import load_star_xyz, load_star_df, load_constellations
from proj_math import (
    get_all_constellations,
    gyro_to_rotation_matrix,
    transform_stars_to_camera,
    project_to_normalized_2d,
    normalize_to_led_pixels,
    build_led_frame,
    build_direction_frame,
    get_direction_to_star,
    OrientationTracker,
    get_frontend_stars,
    star_names,
    constellation_names,
)

# from voice_control import VoiceController


logger = Logger("real-time-accelerometer")
tracker = OrientationTracker()

star_xyz = load_star_xyz()
star_df = load_star_df()
constellations = load_constellations()

# Pre-normalise star coordinates once at startup so transform_stars_to_camera
# doesn't redo it every frame (~30% less work per rotation).
_norms = np.linalg.norm(star_xyz, axis=1, keepdims=True)
_norms = np.where(_norms == 0, 1, _norms)
star_xyz = star_xyz / _norms

# Calibration state
is_calibrating = False
calibration_samples = {"x": [], "y": [], "z": []}
calibration_start = None
CALIBRATION_DURATION = 1.5

# Pointing state
pointing_data = {"yaw": 0.0, "pitch": 0.0, "roll": 0.0, "elevation": 0.0}
frontend_stars = []

STAR_COMPUTE_INTERVAL_S = 0.05  # 50 ms
last_star_compute_time = 0.0

# Find star state
find_star_mode = False
find_star_xyz_target = None
find_star_name = None

# FOV
LED_FOV = 30.0
FRONTEND_FOV = 60.0

# # Voice control state
# VOICE_ENABLED = True
# NUDGE_DEG = 10.0


web_ui = WebUI()
web_ui.app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

gyro_samples = deque(maxlen=200)

def send_led_frame(frame: np.ndarray):
    rows = []
    for row in frame:
        val = 0
        for bit in row:
            val = (val << 1) | int(bit)
        rows.append(int(val))
    Bridge.notify("set_led_top", rows[0], rows[1], rows[2], rows[3])
    Bridge.notify("set_led_bottom", rows[4], rows[5], rows[6], rows[7])

# def test_print():                                                          # unrelated to stars
#     return {"text": "this is some beautiful json that is cool and will be a great test"}  # unrelated to stars

def _get_pointing():
    return pointing_data

def _get_frontend_stars():
    return frontend_stars

def _get_star_names():
    return star_names(star_df)

def _get_constellations_names():
    return constellation_names(constellations)

def _get_all_constellations():
    return get_all_constellations(constellations)

def start_calibration():
    global is_calibrating, calibration_start
    is_calibrating = True
    calibration_start = time.time()
    calibration_samples["x"].clear()
    calibration_samples["y"].clear()
    calibration_samples["z"].clear()
    logger.info("Calibration started — hold still!")
    web_ui.send_message('calibration_started', {})
    return {"status": "calibration started"}

def reset_orientation():
    tracker.reset()
    web_ui.send_message('orientation_reset', {})
    return {"status": "orientation reset"}

# def handle_voice_command(command: str):
#     global current_fov
#     logger.info(f"Voice command: {command}")
#     if command == "up":
#         tracker.pitch = float(np.clip(tracker.pitch + NUDGE_DEG, -90, 90))
#     elif command == "down":
#         tracker.pitch = float(np.clip(tracker.pitch - NUDGE_DEG, -90, 90))
#     elif command == "left":
#         tracker.yaw = (tracker.yaw - NUDGE_DEG) % 360.0
#     elif command == "right":
#         tracker.yaw = (tracker.yaw + NUDGE_DEG) % 360.0
#     elif command == "enhance":
#         current_fov = max(5.0, current_fov - 10.0)
#     elif command == "back":
#         current_fov = min(60.0, current_fov + 10.0)
#     web_ui.send_message('voice_command', {"command": command})

async def find_star(data: dict):
    global find_star_mode, find_star_xyz_target, find_star_name
    hip_id = data.get("hip")
    if hip_id is None:
        return {"error": "no hip id provided"}
    matches = star_df.index[star_df["hip"] == hip_id].tolist()
    if not matches:
        return {"error": f"star hip {hip_id} not found"}
    xyz = star_xyz[matches[0]]
    norm = np.linalg.norm(xyz)
    find_star_xyz_target = xyz / norm if norm > 0 else xyz
    find_star_name = star_df.at[matches[0], "proper"] or str(hip_id)
    find_star_mode = True
    logger.info(f"Find star mode: {find_star_name}")
    web_ui.send_message('find_star_started', {"name": find_star_name})
    return {"status": "find star started", "name": find_star_name}

async def cancel_find_star():
    global find_star_mode, find_star_xyz_target, find_star_name
    find_star_mode = False
    find_star_xyz_target = None
    find_star_name = None
    Bridge.notify("cancel_find_star")
    web_ui.send_message('find_star_cancelled', {})
    return {"status": "cancelled"}

# web_ui.expose_api("GET", "/pointing", _get_pointing)
web_ui.expose_api("GET", "/stars", _get_frontend_stars)
web_ui.expose_api("GET", "/constellations", _get_all_constellations)
web_ui.expose_api("GET", "/star_names", _get_star_names)
web_ui.expose_api("GET", "/constellation_names", _get_constellations_names)
web_ui.expose_api("POST", "/calibrate", start_calibration)
web_ui.expose_api("POST", "/reset", reset_orientation)
web_ui.expose_api("POST", "/find_star", find_star)
web_ui.expose_api("POST", "/cancel_find_star", cancel_find_star)

web_ui.on_connect(
    lambda sid: (
        logger.debug(f"Client connected: {sid}"),
        web_ui.send_message('pointing', pointing_data),
        web_ui.send_message('frontend_stars', frontend_stars),
    )
)

def record_sensor_gyro(x: float, y: float, z: float):
    global is_calibrating, calibration_start, pointing_data
    global frontend_stars, last_star_compute_time
    global find_star_mode, find_star_xyz_target, find_star_name

    gyro_samples.append({"t": time.time(), "x": float(x), "y": float(y), "z": float(z)})

    # --- Integrate orientation ---
    yaw, pitch, roll = tracker.update(x, y, z)
    pointing_data["yaw"]   = round(yaw,   1)
    pointing_data["pitch"] = round(pitch, 1)
    pointing_data["roll"]  = round(roll,  1)

    try:
        web_ui.send_message('pointing', pointing_data)
    except Exception:
        pass

    # --- Build rotation matrix and rotate all stars — done ONCE per frame ---
    # Both LED and frontend projections reuse camera_coords, avoiding a
    # second matrix multiply over the full star catalog.
    try:
        camera_matrix = gyro_to_rotation_matrix(yaw, pitch, roll)
        camera_coords = transform_stars_to_camera(star_xyz, camera_matrix)
    except Exception as e:
        logger.exception(f"Rotation error: {e}")
        return

    direction = None
    try:
        if find_star_mode and find_star_xyz_target is not None:
            cam = camera_matrix @ find_star_xyz_target
            half_fov = np.tan(np.radians(LED_FOV / 2))
            in_view = cam[2] > 0 and abs(cam[0]/cam[2]) <= half_fov and abs(cam[1]/cam[2]) <= half_fov
            direction = {"angle": float(np.degrees(np.arctan2(cam[1], cam[0]))), "in_view": in_view}

            if in_view:
                projected_led, mask_led = project_to_normalized_2d(camera_coords, LED_FOV)
                pixels = normalize_to_led_pixels(projected_led, mask_led)
                send_led_frame(build_led_frame(pixels, mask_led))
            else:
                send_led_frame(build_direction_frame(direction))
        else:
            projected_led, mask_led = project_to_normalized_2d(camera_coords, LED_FOV)
            pixels = normalize_to_led_pixels(projected_led, mask_led)
            send_led_frame(build_led_frame(pixels, mask_led))
    except Exception as e:
        logger.exception(f"LED error: {e}")

    # --- Throttled star computation + WebSocket push at ~20 Hz ---
    now = time.time()
    if now - last_star_compute_time >= STAR_COMPUTE_INTERVAL_S:
        last_star_compute_time = now
        try:
            frontend_stars = get_frontend_stars(camera_coords, star_df, FRONTEND_FOV)
            web_ui.send_message('frontend_stars', frontend_stars)
        except Exception as e:
            logger.exception(f"math function error: {e}")

    # Notify find-star completion (event-driven, not pollable)
    if find_star_mode and direction is not None and direction["in_view"]:
        web_ui.send_message('star_found', {"name": find_star_name})
        find_star_mode = False
        find_star_xyz_target = None
        find_star_name = None

def record_elevation(elevation: float):
    global pointing_data
    pointing_data["elevation"] = round(elevation, 1)

try:
    Bridge.provide("record_sensor_gyro", record_sensor_gyro)
except RuntimeError:
    logger.debug("'record_sensor_gyro' already registered")

try:
    Bridge.provide("record_elevation", record_elevation)
except RuntimeError:
    logger.debug("'record_elevation' already registered")

# --- Start voice control ---
# if VOICE_ENABLED:
#     try:
#         voice = VoiceController(handle_voice_command)
#         voice.start()
#         logger.info("Voice control started")
#     except Exception as e:
#         logger.warning(f"Voice control failed to start: {e}")

logger.info("Starting App...")
App.run()