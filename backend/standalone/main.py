"""
Standalone Viewfinder server — no Arduino hardware required.

Replaces the Arduino gyroscope with mouse-based camera control:
  - Click & drag to pan (yaw / pitch)
  - Scroll wheel to zoom (FOV)
  - "Find star" shows a directional arrow toward the target

Run:
    pip install -r requirements.txt
    python main.py
"""

import sys
from pathlib import Path
import numpy as np
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import socketio
import uvicorn

_ARDUINO_PYTHON_DIR = (
    Path(__file__).resolve().parent.parent
    / "arduino_app" / "working_arduino_app" / "python"
)
sys.path.insert(0, str(_ARDUINO_PYTHON_DIR))

from proj_math import (
    gyro_to_rotation_matrix,
    transform_stars_to_camera,
    get_frontend_stars,
    star_names,
    constellation_names,
    get_all_constellations,
)
from read_data import load_star_xyz, load_star_df, load_constellations

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

ASSETS_DIR = _ARDUINO_PYTHON_DIR / "assets"

star_xyz_raw = load_star_xyz(str(ASSETS_DIR / "stars.csv"))
star_df = load_star_df(str(ASSETS_DIR / "stars.csv"))
constellations_df = load_constellations(str(ASSETS_DIR / "constellations.csv"))

_norms = np.linalg.norm(star_xyz_raw, axis=1, keepdims=True)
_norms = np.where(_norms == 0, 1, _norms)
star_xyz = star_xyz_raw / _norms

# ---------------------------------------------------------------------------
# Camera state
# ---------------------------------------------------------------------------

camera = {
    "yaw": 0.0,
    "pitch": 0.0,
    "roll": 0.0,
    "fov": 60.0,
}

MOUSE_SENSITIVITY = 0.07

frontend_stars_cache: list = []
_camera_matrix: np.ndarray | None = None

find_star_state = {
    "active": False,
    "hip": None,
    "xyz": None,
    "name": None,
}


def compute_stars():
    global frontend_stars_cache, _camera_matrix
    _camera_matrix = gyro_to_rotation_matrix(
        camera["yaw"], camera["pitch"], camera["roll"]
    )
    coords = transform_stars_to_camera(star_xyz, _camera_matrix)
    frontend_stars_cache = get_frontend_stars(coords, star_df, camera["fov"])


def get_direction():
    """Compute direction from current camera to find-star target."""
    if not find_star_state["active"] or _camera_matrix is None:
        return {"active": False}

    cam = _camera_matrix @ find_star_state["xyz"]
    half_fov = np.tan(np.radians(camera["fov"] / 2))
    in_view = False
    if cam[2] > 0:
        if abs(cam[0] / cam[2]) <= half_fov and abs(cam[1] / cam[2]) <= half_fov:
            in_view = True

    angle = float(np.degrees(np.arctan2(cam[1], cam[0])))
    return {
        "active": True,
        "angle": angle,
        "in_view": in_view,
        "hip": find_star_state["hip"],
        "name": find_star_state["name"],
    }


async def broadcast():
    """Recompute stars and push everything to all clients."""
    compute_stars()
    await sio.emit("frontend_stars", frontend_stars_cache)
    await sio.emit("find_star_direction", get_direction())


compute_stars()

# ---------------------------------------------------------------------------
# Server setup
# ---------------------------------------------------------------------------

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

fastapi_app = FastAPI()
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app = socketio.ASGIApp(sio, fastapi_app)

# ---------------------------------------------------------------------------
# Socket.IO events
# ---------------------------------------------------------------------------


@sio.event
async def connect(sid, environ):
    await sio.emit("frontend_stars", frontend_stars_cache, to=sid)
    await sio.emit("pointing", camera, to=sid)
    await sio.emit("find_star_direction", get_direction(), to=sid)


@sio.event
async def camera_move(sid, data):
    dx = data.get("dx", 0) if isinstance(data, dict) else 0
    dy = data.get("dy", 0) if isinstance(data, dict) else 0

    camera["yaw"] = (camera["yaw"] + dx * MOUSE_SENSITIVITY) % 360.0
    camera["pitch"] = float(
        np.clip(camera["pitch"] + dy * MOUSE_SENSITIVITY, -90, 90)
    )

    await broadcast()


@sio.event
async def camera_zoom(sid, data):
    delta = data.get("delta", 0) if isinstance(data, dict) else 0
    camera["fov"] = float(np.clip(camera["fov"] + delta, 10.0, 120.0))
    await broadcast()


@sio.event
async def camera_roll(sid, data):
    delta = data.get("delta", 0) if isinstance(data, dict) else 0
    camera["roll"] = (camera["roll"] + float(delta)) % 360.0
    await broadcast()


# ---------------------------------------------------------------------------
# REST endpoints (same contract as the Arduino backend)
# ---------------------------------------------------------------------------


@fastapi_app.get("/stars")
def get_stars():
    return frontend_stars_cache


@fastapi_app.get("/star_names")
def get_star_names_endpoint():
    return star_names(star_df)


@fastapi_app.get("/constellation_names")
def get_constellation_names_endpoint():
    return constellation_names(constellations_df)


@fastapi_app.get("/constellations")
def get_constellations_endpoint():
    return get_all_constellations(constellations_df)


@fastapi_app.post("/find_star")
async def find_star_endpoint(request: Request):
    data = await request.json()
    hip_id = data.get("hip")
    if hip_id is None:
        return {"error": "no hip id provided"}

    matches = star_df.index[star_df["hip"] == hip_id].tolist()
    if not matches:
        return {"error": f"star hip {hip_id} not found"}

    idx = matches[0]
    xyz = star_xyz[idx]
    name = star_df.at[idx, "proper"] if star_df.at[idx, "proper"] else str(hip_id)

    find_star_state["active"] = True
    find_star_state["hip"] = int(hip_id)
    find_star_state["xyz"] = xyz
    find_star_state["name"] = str(name)

    compute_stars()
    await sio.emit("find_star_direction", get_direction())
    return {"status": "find star started", "name": str(name)}


@fastapi_app.post("/cancel_find_star")
async def cancel_find_star_endpoint():
    find_star_state["active"] = False
    find_star_state["hip"] = None
    find_star_state["xyz"] = None
    find_star_state["name"] = None
    await sio.emit("find_star_direction", {"active": False})
    return {"status": "cancelled"}


@fastapi_app.post("/calibrate")
async def calibrate_endpoint():
    return {"status": "no calibration needed in standalone mode"}


@fastapi_app.post("/reset")
async def reset_endpoint():
    camera["yaw"] = 0.0
    camera["pitch"] = 0.0
    camera["roll"] = 0.0
    camera["fov"] = 60.0
    find_star_state["active"] = False
    find_star_state["hip"] = None
    find_star_state["xyz"] = None
    find_star_state["name"] = None
    await broadcast()
    return {"status": "orientation reset"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Starting Viewfinder standalone server on http://127.0.0.1:2705")
    uvicorn.run(app, host="127.0.0.1", port=2705)
