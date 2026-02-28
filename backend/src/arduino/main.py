# SPDX-FileCopyrightText: Copyright (C) ARDUINO SRL (http://www.arduino.cc)
#
# SPDX-License-Identifier: MPL-2.0

from arduino.app_utils import *
from arduino.app_bricks.web_ui import WebUI
from arduino.app_bricks.motion_detection import MotionDetection
import pandas as pd
from collections import deque
import time

CONFIDENCE = 0.4
motion_detection = MotionDetection(confidence=CONFIDENCE)

logger = Logger("real-time-accelerometer")
logger.debug(f"MotionDetection instantiated with confidence={CONFIDENCE}")

detection_df = pd.DataFrame(
    {
        'idle': [0.0],
        'snake': [0.0],
        'updown': [0.0],
        'wave' : [0.0]
    }
)

web_ui = WebUI()

def _get_detection():
    return detection_df.to_dict(orient='records')[0]

def test_print():
    return {"text": "this is some beautiful json that is cool and will be a great test"}

web_ui.expose_api("GET", "/test", test_print)
web_ui.expose_api("GET", "/detection", _get_detection)

web_ui.on_connect(
    lambda sid: (
        logger.debug(f"Client connected: {sid} - sending current detection"),
        web_ui.send_message('movement', detection_df.to_dict(orient='records')[0])
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

SAMPLES_MAX = 200
samples = deque(maxlen=SAMPLES_MAX)
gyro_samples = deque(maxlen=SAMPLES_MAX)
orientation_data = {"ax": 0.0, "ay": 0.0, "az": 0.0, "angle": 0.0}

def _get_samples():
    return list(samples)

def _get_gyro_samples():
    return list(gyro_samples)

def _get_orientation():
    return orientation_data

web_ui.expose_api("GET", "/samples", _get_samples)
web_ui.expose_api("GET", "/gyro_samples", _get_gyro_samples)
web_ui.expose_api("GET", "/orientation", _get_orientation)

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
    try:
        sample = {"t": time.time(), "x": float(x), "y": float(y), "z": float(z)}
        gyro_samples.append(sample)
        try:
            web_ui.send_message('gyro_sample', sample)
        except Exception:
            logger.debug('Failed to emit gyro sample websocket message')
    except Exception as e:
        logger.exception(f"record_sensor_gyro: Error: {e}")

def record_orientation(ax: float, ay: float, az: float, angle: float):
    global orientation_data
    orientation_data = {
        "ax": round(ax, 3),
        "ay": round(ay, 3),
        "az": round(az, 3),
        "angle": round(angle, 1)
    }
    web_ui.send_message('orientation', orientation_data)

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

logger.info("Starting App...")
App.run()