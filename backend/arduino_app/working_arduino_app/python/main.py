# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.motion_detection import MotionDetection
import pandas as pd
import time
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from read_data import load_star_xyz, load_star_df, load_constellations
from proj_math import get_frontend_stars, OrientationTracker, constellation_names, star_names, get_visible_constellations
from collections import deque

#------Setup-----------------------------------------------------

SAMPLES_MAX = 200
CALIBRATION_DURATION = 1.5
CONFIDENCE = 0.4

class AppState:
    def __init__(self):
        self.star_xyz = load_star_xyz()
        self.star_df = load_star_df()
        self.constellations = load_constellations()
        self.pointing_data = {"yaw": 0.0, "pitch": 0.0, "roll": 0.0, "elevation": 0.0}
        self.frontend_stars = {}
        self.orientation_data = {"ax": 0.0, "ay": 0.0, "az": 0.0, "angle": 0.0}
        self.detection_df = pd.DataFrame(
            {
                'idle':   [0.0],
                'snake':  [0.0],
                'updown': [0.0],
                'wave':   [0.0]
            }
        )
        self.samples = deque(maxlen=SAMPLES_MAX)
        self.gyro_samples = deque(maxlen=SAMPLES_MAX)
        self.is_calibrating = False
        self.calibration_start = None
        self.calibration_samples = {"x": [], "y": [], "z": []}

state = AppState()
logger = Logger("real-time-accelerometer")
tracker = OrientationTracker()
motion_detection = MotionDetection(confidence=CONFIDENCE)
web_ui = WebUI()
web_ui.app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#------ WebUI -----------------------------------------------------

def _get_detection():
    return state.detection_df.to_dict(orient='records')[0]

def test_print():
    return {"text": "this is some beautiful json that is cool and will be a great test"}

def _get_samples():
    return list(state.samples)

def _get_gyro_samples():
    return list(state.gyro_samples)

def _get_orientation():
    return state.orientation_data

def _get_pointing():
    return state.pointing_data

def _get_frontend_stars():
    return state.frontend_stars

def _get_constellations():
    return get_visible_constellations(state.constellations, state.frontend_stars)

def _get_star_names():
    return star_names(state.star_df)

def _get_constellations_names():
    return constellation_names(state.constellations)

def start_calibration():
    state.is_calibrating = True
    state.calibration_start = time.time()
    state.calibration_samples["x"].clear()
    state.calibration_samples["y"].clear()
    state.calibration_samples["z"].clear()
    logger.info("Calibration started — hold still!")
    web_ui.send_message('calibration_started', {})
    return {"status": "calibration started"}

def reset_orientation():
    tracker.reset()
    web_ui.send_message('orientation_reset', {})
    return {"status": "orientation reset"}

web_ui.expose_api("GET", "/detection", _get_detection)
web_ui.expose_api("GET", "/test", test_print)
web_ui.expose_api("GET", "/samples", _get_samples)
web_ui.expose_api("GET", "/gyro_samples", _get_gyro_samples)
web_ui.expose_api("GET", "/orientation", _get_orientation)
web_ui.expose_api("GET", "/pointing", _get_pointing)
web_ui.expose_api("GET", "/stars", _get_frontend_stars)
web_ui.expose_api("GET", "/constellations", _get_constellations)
web_ui.expose_api("GET", "/star_names", _get_star_names)
web_ui.expose_api("GET", "/constellations_names", _get_constellations_names)
web_ui.expose_api("POST", "/calibrate", start_calibration)
web_ui.expose_api("POST", "/reset", reset_orientation)

web_ui.on_connect(
    lambda sid: (
        logger.debug(f"Client connected: {sid} - sending current detection"),
        web_ui.send_message('movement', state.detection_df.to_dict(orient='records')[0]),
        web_ui.send_message('pointing', state.pointing_data),
        web_ui.send_message('frontend_stars', state.frontend_stars)
    )
)

#------ Arduino -----------------------------------------------------

def on_movement_detected(classification: dict):
    if not classification:
        return
    try:
        state.detection_df = pd.DataFrame(
            {
                'idle':   [classification.get('idle', 0.0)],
                'snake':  [classification.get('snake', 0.0)],
                'updown': [classification.get('updown', 0.0)],
                'wave':   [classification.get('wave', 0.0)]
            }
        )
        try:
            web_ui.send_message('movement', state.detection_df.to_dict(orient='records')[0])
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
        state.samples.append(sample)
        try:
            web_ui.send_message('sample', sample)
        except Exception:
            logger.debug('Failed to emit sample websocket message')
    except Exception as e:
        logger.exception(f"record_sensor_movement: Error: {e}")

def record_sensor_gyro(x: float, y: float, z: float):
    try:
        sample = {"t": time.time(), "x": float(x), "y": float(y), "z": float(z)}
        state.gyro_samples.append(sample)
        web_ui.send_message('gyro_sample', sample)
    except Exception:
        logger.debug('Failed to emit gyro sample websocket message')

    if state.is_calibrating:
        state.calibration_samples["x"].append(x)
        state.calibration_samples["y"].append(y)
        state.calibration_samples["z"].append(z)
        if time.time() - state.calibration_start >= CALIBRATION_DURATION:
            tracker._bias_x = float(np.mean(state.calibration_samples["x"]))
            tracker._bias_y = float(np.mean(state.calibration_samples["y"]))
            tracker._bias_z = float(np.mean(state.calibration_samples["z"]))
            tracker._calibrated = True
            tracker._last_time = time.time()
            state.calibration_samples["x"].clear()
            state.calibration_samples["y"].clear()
            state.calibration_samples["z"].clear()
            state.is_calibrating = False
            web_ui.send_message('calibration_done', {})
            logger.info(f"Calibration complete. Bias → x:{tracker._bias_x:.4f} y:{tracker._bias_y:.4f} z:{tracker._bias_z:.4f}")
        return

    yaw, pitch, roll = tracker.update(x, y, z)
    state.pointing_data["yaw"] = round(yaw, 1)
    state.pointing_data["pitch"] = round(pitch, 1)
    state.pointing_data["roll"] = round(roll, 1)
    try:
        web_ui.send_message('pointing', state.pointing_data)
    except Exception:
        logger.debug('Failed to emit pointing websocket message')

    try:
        state.frontend_stars = get_frontend_stars(star_xyz, yaw, pitch, roll)
        web_ui.send_message('frontend_stars', state.frontend_stars)
    except Exception as e:
        logger.exception(f"math function error: {e}")

def record_orientation(ax: float, ay: float, az: float, angle: float):
    state.orientation_data = {
        "ax": round(ax, 3),
        "ay": round(ay, 3),
        "az": round(az, 3),
        "angle": round(angle, 1)
    }
    web_ui.send_message('orientation', state.orientation_data)

def record_elevation(elevation: float):
    state.pointing_data["elevation"] = round(elevation, 1)

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