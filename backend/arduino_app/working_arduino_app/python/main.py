# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.motion_detection import MotionDetection
import pandas as pd
from collections import deque
import time
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from read_data import load_star_xyz, load_star_df, load_constellations
from proj_math import get_frontend_stars, OrientationTracker, constellation_names, star_names, get_visible_constellations, get_led_view, build_led_frame, get_direction_to_star

CONFIDENCE = 0.4
motion_detection = MotionDetection(confidence=CONFIDENCE)

logger = Logger("real-time-accelerometer")
logger.debug(f"MotionDetection instantiated with confidence={CONFIDENCE}")

tracker = OrientationTracker()

star_xyz = load_star_xyz()
star_df = load_star_df()
constellations = load_constellations()

# Calibration state
is_calibrating = False
calibration_samples = {"x": [], "y": [], "z": []}
calibration_start = None
CALIBRATION_DURATION = 1.5

# Pointing state
pointing_data = {"yaw": 0.0, "pitch": 0.0, "roll": 0.0, "elevation": 0.0}
frontend_stars = []
visible_constellations = []

# Find star state
find_star_mode = False
find_star_xyz_target = None
find_star_name = None

# FOV state
current_fov = 30.0

detection_df = pd.DataFrame(
    {
        'idle': [0.0],
        'snake': [0.0],
        'updown': [0.0],
        'wave' : [0.0]
    }
)

web_ui = WebUI()
web_ui.app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SAMPLES_MAX = 200
samples = deque(maxlen=SAMPLES_MAX)
gyro_samples = deque(maxlen=SAMPLES_MAX)
orientation_data = {"ax": 0.0, "ay": 0.0, "az": 0.0, "angle": 0.0}

def send_led_frame(frame: np.ndarray):
    rows = []
    for row in frame:
        val = 0
        for bit in row:
            val = (val << 1) | int(bit)
        rows.append(int(val))
    Bridge.notify("set_led_top", rows[0], rows[1], rows[2], rows[3])
    Bridge.notify("set_led_bottom", rows[4], rows[5], rows[6], rows[7])

def _get_detection():
    return detection_df.to_dict(orient='records')[0]

def test_print():
    return {"text": "this is some beautiful json that is cool and will be a great test"}

def _get_samples():
    return list(samples)

def _get_gyro_samples():
    return list(gyro_samples)

def _get_orientation():
    return orientation_data

def _get_pointing():
    return pointing_data

def _get_frontend_stars():
    return frontend_stars

def _get_visible_constellations():
    return visible_constellations

def _get_star_names():
    return star_names(star_df)

def _get_constellations_names():
    return constellation_names(constellations)

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

def find_star(data: dict):
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

def cancel_find_star():
    global find_star_mode, find_star_xyz_target, find_star_name
    find_star_mode = False
    find_star_xyz_target = None
    find_star_name = None
    Bridge.notify("cancel_find_star")
    web_ui.send_message('find_star_cancelled', {})
    return {"status": "cancelled"}

web_ui.expose_api("GET", "/detection", _get_detection)
web_ui.expose_api("GET", "/test", test_print)
web_ui.expose_api("GET", "/samples", _get_samples)
web_ui.expose_api("GET", "/gyro_samples", _get_gyro_samples)
web_ui.expose_api("GET", "/orientation", _get_orientation)
web_ui.expose_api("GET", "/pointing", _get_pointing)
web_ui.expose_api("GET", "/stars", _get_frontend_stars)
web_ui.expose_api("GET", "/constellations", _get_visible_constellations)
web_ui.expose_api("GET", "/star_names", _get_star_names)
web_ui.expose_api("GET", "/constellation_names", _get_constellations_names)
web_ui.expose_api("POST", "/calibrate", start_calibration)
web_ui.expose_api("POST", "/reset", reset_orientation)
web_ui.expose_api("POST", "/find_star", find_star)
web_ui.expose_api("POST", "/cancel_find_star", cancel_find_star)

web_ui.on_connect(
    lambda sid: (
        logger.debug(f"Client connected: {sid} - sending current detection"),
        web_ui.send_message('movement', detection_df.to_dict(orient='records')[0]),
        web_ui.send_message('pointing', pointing_data),
    )
)

def on_movement_detected(classification: dict):
    if not classification:
        return
    try:
        global detection_df
        detection_df = pd.DataFrame(
            {
                'idle': [classification.get('idle', 0.0)],
                'snake': [classification.get('snake', 0.0)],
                'updown': [classification.get('updown', 0.0)],
                'wave' : [classification.get('wave', 0.0)]
            }
        )
        try:
            web_ui.send_message('movement', detection_df.to_dict(orient='records')[0])
        except Exception as e:
            logger.warning(f"Failed to broadcast 'movement' message: {e}")
    except Exception as e:
        logger.exception(f"dataframe: Error: {e}")

motion_detection.on_movement_detection('idle', on_movement_detected)
motion_detection.on_movement_detection('snake', on_movement_detected)
motion_detection.on_movement_detection('updown', on_movement_detected)
motion_detection.on_movement_detection('wave', on_movement_detected)

def record_sensor_movement(x: float, y: float, z: float):
    try:
        x_ms2 = x * 9.81
        y_ms2 = y * 9.81
        z_ms2 = z * 9.81
        motion_detection.accumulate_samples((x_ms2, y_ms2, z_ms2))
        sample = {"t": time.time(), "x": float(x), "y": float(y), "z": float(z)}
        samples.append(sample)
        try:
            web_ui.send_message('sample', sample)
        except Exception:
            logger.debug('Failed to emit sample websocket message')
    except Exception as e:
        logger.exception(f"record_sensor_movement: Error: {e}")

def record_sensor_gyro(x: float, y: float, z: float):
    global is_calibrating, calibration_start, pointing_data, frontend_stars, visible_constellations, current_fov

    try:
        sample = {"t": time.time(), "x": float(x), "y": float(y), "z": float(z)}
        gyro_samples.append(sample)
        web_ui.send_message('gyro_sample', sample)
    except Exception:
        logger.debug('Failed to emit gyro sample websocket message')

    if is_calibrating:
        calibration_samples["x"].append(x)
        calibration_samples["y"].append(y)
        calibration_samples["z"].append(z)
        if time.time() - calibration_start >= CALIBRATION_DURATION:
            tracker._bias_x = float(np.mean(calibration_samples["x"]))
            tracker._bias_y = float(np.mean(calibration_samples["y"]))
            tracker._bias_z = float(np.mean(calibration_samples["z"]))
            tracker._calibrated = True
            tracker._last_time = time.time()
            calibration_samples["x"].clear()
            calibration_samples["y"].clear()
            calibration_samples["z"].clear()
            is_calibrating = False
            web_ui.send_message('calibration_done', {})
            logger.info(f"Calibration complete. Bias → x:{tracker._bias_x:.4f} y:{tracker._bias_y:.4f} z:{tracker._bias_z:.4f}")
        return

    yaw, pitch, roll = tracker.update(x, y, z)
    pointing_data["yaw"] = round(yaw, 1)
    pointing_data["pitch"] = round(pitch, 1)
    pointing_data["roll"] = round(roll, 1)
    try:
        web_ui.send_message('pointing', pointing_data)
    except Exception:
        logger.debug('Failed to emit pointing websocket message')

    try:
        if find_star_mode and find_star_xyz_target is not None:
            direction = get_direction_to_star(find_star_xyz_target, yaw, pitch, roll)
            Bridge.notify("set_find_star",
                float(direction["angle"]),
                float(direction["distance"]),
                1.0 if direction["in_view"] else 0.0)
            web_ui.send_message('find_star_status', direction)
            if direction["in_view"]:
                web_ui.send_message('star_found', {"name": find_star_name})
        else:
            pixels, visible_mask = get_led_view(star_xyz, yaw, pitch, roll, fov_deg=current_fov)
            frame = build_led_frame(pixels, visible_mask)
            logger.debug(f"LED frame sum: {frame.sum()} visible stars: {visible_mask.sum()}")
            send_led_frame(frame)

        frontend_stars = get_frontend_stars(star_xyz, star_df, yaw, pitch, roll)
        visible_constellations = get_visible_constellations(constellations, frontend_stars)
        web_ui.send_message('frontend_stars', frontend_stars)
        web_ui.send_message('visible_constellations', visible_constellations)
    except Exception as e:
        logger.exception(f"LED/math function error: {e}")

def record_orientation(ax: float, ay: float, az: float, angle: float):
    global orientation_data
    orientation_data = {
        "ax": round(ax, 3),
        "ay": round(ay, 3),
        "az": round(az, 3),
        "angle": round(angle, 1)
    }
    web_ui.send_message('orientation', orientation_data)

def record_elevation(elevation: float):
    global pointing_data
    pointing_data["elevation"] = round(elevation, 1)

try:
    Bridge.provide("record_sensor_movement", record_sensor_movement)
except RuntimeError:
    logger.debug("'record_sensor_movement' already registered")

try:
    Bridge.provide("record_sensor_gyro", record_sensor_gyro)
except RuntimeError:
    logger.debug("'record_sensor_gyro' already registered")

try:
    Bridge.provide("orientation", record_orientation)
except RuntimeError:
    logger.debug("'orientation' already registered")

try:
    Bridge.provide("record_elevation", record_elevation)
except RuntimeError:
    logger.debug("'record_elevation' already registered")

logger.info("Starting App...")
App.run()