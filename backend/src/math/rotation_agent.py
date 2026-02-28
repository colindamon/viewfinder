"""
math_module.py — Viewfinder
----------------------------
Transforms HYG 3D star coordinates into 2D display coordinates
based on device orientation (yaw, pitch, roll) from the Modulino Movement.

Coordinate Systems
------------------
HYG (world space):
    +X → vernal equinox (RA 0h, Dec 0°)
    +Y → RA 6h, Dec 0°
    +Z → north celestial pole (Dec +90°)

Camera space (after rotation):
    +X → right
    +Y → up
    +Z → into the screen (the direction we're pointing)

2D output:
    (0, 0) → top-left of display
    (cols-1, rows-1) → bottom-right of display
    For the LED matrix, default is 12 cols x 8 rows (adjust as needed)
"""

import numpy as np
from typing import Optional


# ---------------------------------------------------------------------------
# Rotation matrices
# ---------------------------------------------------------------------------

def rot_x(angle_rad: float) -> np.ndarray:
    """Rotation matrix around the X axis (pitch)."""
    c, s = np.cos(angle_rad), np.sin(angle_rad)
    return np.array([
        [1,  0,  0],
        [0,  c, -s],
        [0,  s,  c]
    ], dtype=float)


def rot_y(angle_rad: float) -> np.ndarray:
    """Rotation matrix around the Y axis (yaw)."""
    c, s = np.cos(angle_rad), np.sin(angle_rad)
    return np.array([
        [ c,  0,  s],
        [ 0,  1,  0],
        [-s,  0,  c]
    ], dtype=float)


def rot_z(angle_rad: float) -> np.ndarray:
    """Rotation matrix around the Z axis (roll)."""
    c, s = np.cos(angle_rad), np.sin(angle_rad)
    return np.array([
        [c, -s,  0],
        [s,  c,  0],
        [0,  0,  1]
    ], dtype=float)


def gyro_to_rotation_matrix(yaw_deg: float, pitch_deg: float, roll_deg: float) -> np.ndarray:
    """
    Build the full camera rotation matrix from Modulino yaw, pitch, roll (degrees).

    Convention (intrinsic, applied in order: yaw → pitch → roll):
        yaw   — rotation around world Z (panning left/right across the sky)
        pitch — rotation around local X (tilting up/down)
        roll  — rotation around local Z (rotating the device in-hand)

    Returns a 3x3 rotation matrix camera_matrix such that:
        star_camera = camera_matrix @ star_world
    """
    yaw   = np.radians(yaw_deg)
    pitch = np.radians(pitch_deg)
    roll  = np.radians(roll_deg)

    camera_matrix = rot_z(roll) @ rot_x(pitch) @ rot_y(yaw)
    return camera_matrix


# ---------------------------------------------------------------------------
# Core projection pipeline
# ---------------------------------------------------------------------------

def transform_stars_to_camera(
    star_xyz: np.ndarray,
    camera_matrix: np.ndarray
) -> np.ndarray:
    """
    Rotate star world-space coordinates into camera space.

    Parameters
    ----------
    star_xyz : np.ndarray, shape (N, 3)
        HYG x, y, z columns for N stars.
    camera_matrix : np.ndarray, shape (3, 3)
        Camera rotation matrix from gyro_to_rotation_matrix().

    Returns
    -------
    np.ndarray, shape (N, 3)
        Stars in camera space. Stars with camera_z > 0 are in front of the camera.
    """
    # Normalise to unit vectors — distance to the star is irrelevant for
    # direction, and HYG distances vary wildly.
    norms = np.linalg.norm(star_xyz, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)          # guard against zero-vector
    unit_xyz = star_xyz / norms

    # Apply rotation: each row is a star, so we transpose for matrix multiply
    camera_coords = (camera_matrix @ unit_xyz.T).T              # shape (N, 3)
    return camera_coords


def project_to_normalized_2d(
    camera_coords: np.ndarray,
    fov_deg: float = 30.0
) -> tuple[np.ndarray, np.ndarray]:
    """
    Project camera-space unit vectors onto a 2D plane using perspective projection.

    Only stars in front of the camera (camera_z > 0) are valid.

    Parameters
    ----------
    camera_coords : np.ndarray, shape (N, 3)
        Output of transform_stars_to_camera().
    fov_deg : float
        Horizontal field of view in degrees. A smaller value = more zoomed in.
        Typical LED matrix FOV: 20–40°.

    Returns
    -------
    projected : np.ndarray, shape (N, 2)
        Normalised 2D coordinates in [-1, 1] x [-1, 1].
        (0, 0) is the centre of the view.
    visible_mask : np.ndarray, shape (N,), dtype bool
        True for stars that are in front of the camera AND within the FOV.
    """
    # Stars behind the camera are immediately discarded
    in_front = camera_coords[:, 2] > 0

    # Perspective divide — project onto the z=1 plane
    # Avoid division by zero for stars exactly at z=0
    z = np.where(camera_coords[:, 2] == 0, 1e-9, camera_coords[:, 2])
    x_proj = camera_coords[:, 0] / z               # horizontal, right is +
    y_proj = camera_coords[:, 1] / z               # vertical,   up    is +

    # FOV clipping: half-angle determines the visible range on the z=1 plane
    half_fov = np.tan(np.radians(fov_deg / 2))
    in_fov = (
        in_front
        & (np.abs(x_proj) <= half_fov)
        & (np.abs(y_proj) <= half_fov)
    )

    # Normalise to [-1, 1]
    x_norm = x_proj / half_fov
    y_norm = y_proj / half_fov

    projected = np.column_stack([x_norm, y_norm])  # shape (N, 2)
    return projected, in_fov


def normalize_to_led_pixels(
    projected: np.ndarray,
    visible_mask: np.ndarray,
    cols: int = 12,
    rows: int = 8
) -> np.ndarray:
    """
    Map normalised [-1, 1] 2D coordinates to integer pixel positions on the display.

    Parameters
    ----------
    projected : np.ndarray, shape (N, 2)
        Output of project_to_normalized_2d().
    visible_mask : np.ndarray, shape (N,), dtype bool
        Only visible stars are mapped; others are returned as (-1, -1).
    cols : int
        Number of columns on the LED matrix (default 12).
    rows : int
        Number of rows on the LED matrix (default 8).

    Returns
    -------
    pixels : np.ndarray, shape (N, 2), dtype int
        (col, row) pixel positions. (-1, -1) means not visible.
    """
    pixels = np.full((len(projected), 2), -1, dtype=int)

    vis = projected[visible_mask]

    # x_norm: -1 = left edge, +1 = right edge  →  col 0 … cols-1
    # y_norm: -1 = bottom,    +1 = top          →  row rows-1 … 0  (flip Y)
    col = np.clip(((vis[:, 0] + 1) / 2 * cols).astype(int), 0, cols - 1)
    row = np.clip(((1 - (vis[:, 1] + 1) / 2) * rows).astype(int), 0, rows - 1)

    pixels[visible_mask, 0] = col
    pixels[visible_mask, 1] = row

    return pixels


# ---------------------------------------------------------------------------
# High-level convenience function
# ---------------------------------------------------------------------------
def _project_stars(star_xyz, yaw_deg, pitch_deg, roll_deg, fov_deg):
    camera_matrix = gyro_to_rotation_matrix(yaw_deg, pitch_deg, roll_deg)
    camera_coords = transform_stars_to_camera(star_xyz, camera_matrix)
    return project_to_normalized_2d(camera_coords, fov_deg)

def get_led_view(
    star_xyz: np.ndarray,
    yaw_deg: float,
    pitch_deg: float,
    roll_deg: float,
    fov_deg: float = 30.0,
    cols: int = 12,
    rows: int = 8
) -> tuple[np.ndarray, np.ndarray]:
    """
    Full pipeline: HYG xyz → LED matrix pixel positions.

    Parameters
    ----------
    star_xyz : np.ndarray, shape (N, 3)
        HYG x, y, z for N stars.
    yaw_deg : float
        Yaw from Modulino (degrees).
    pitch_deg : float
        Pitch from Modulino (degrees).
    roll_deg : float
        Roll from Modulino (degrees).
    fov_deg : float
        Horizontal field of view (degrees). Adjust to taste.
    cols : int
        LED matrix columns.
    rows : int
        LED matrix rows.

    Returns
    -------
    pixels : np.ndarray, shape (N, 2), dtype int
        (col, row) for each star. (-1, -1) if not visible.
    visible_mask : np.ndarray, shape (N,), dtype bool
        True for every star that landed on the display.
    """
    projected, visible_mask = _project_stars(star_xyz, yaw_deg, pitch_deg, roll_deg, fov_deg)
    pixels = normalize_to_led_pixels(projected, visible_mask, cols, rows)

    return pixels, visible_mask

def get_frontend_direction(yaw_deg: float, pitch_deg: float) -> dict:
    """
    Returns the device's current pointing direction for the frontend.

    Called whenever the Arduino sends a new orientation reading, independently
    of the star list. The frontend uses this to draw a bounding box on its
    full sky map showing where the device is currently aimed.

    Parameters
    ----------
    yaw_deg : float
        Yaw from orientation.py (degrees).
    pitch_deg : float
        Pitch from orientation.py (degrees).

    Returns
    -------
    dict with keys:
        "pointing" : {"yaw": float, "pitch": float}
        "fov_deg"  : float — the device's FOV so the frontend can size the bounding box
    """
    return {
        "pointing": {"yaw": yaw_deg, "pitch": pitch_deg},
        "fov_deg":  60.0,
    }


def get_frontend_stars(
    star_xyz: np.ndarray,
    star_df,
    yaw_deg: float,
    pitch_deg: float,
    roll_deg: float,
    fov_deg: float = 60.0,
) -> list:
    """
    Full pipeline: HYG xyz → frontend-ready list of visible stars.

    The primary output function for the React frontend. Can be called both
    when the Arduino is active (live orientation) and when the user is
    browsing the sky map independently on the laptop. Returns only the stars
    currently in view — the frontend never touches the star database directly.

    FOV is intentionally wider than get_led_view (60° vs 30°) since the
    frontend has a full screen to work with.

    Parameters
    ----------
    star_xyz : np.ndarray, shape (N, 3)
        HYG x, y, z columns for N stars.
    star_df : pd.DataFrame
        The full HYG DataFrame, aligned row-for-row with star_xyz.
        Expected columns: "proper", "mag", "con".
    yaw_deg : float
        Yaw from orientation.py (degrees).
    pitch_deg : float
        Pitch from orientation.py (degrees).
    roll_deg : float
        Roll from orientation.py (degrees). Used in the projection but not
        returned — roll doesn't change what region of sky is visible.
    fov_deg : float
        Horizontal field of view in degrees (default 60°).

    Returns
    -------
    list of dicts, one per visible star:
        "x"             : float, normalised -1 (left) to +1 (right)
        "y"             : float, normalised -1 (bottom) to +1 (top)
        "name"          : str or None — proper name if one exists in HYG
        "magnitude"     : float — brightness, lower is brighter
        "constellation" : str — IAU constellation abbreviation e.g. "Ori"
    """
    projected, visible_mask = _project_stars(star_xyz, yaw_deg, pitch_deg, roll_deg, fov_deg)
    visible_proj = projected[visible_mask]
    visible_meta = star_df[visible_mask].reset_index(drop=True)

    return [
        {
            "x":             float(visible_proj[i, 0]),   # -1 (left)  to +1 (right)
            "y":             float(visible_proj[i, 1]),   # -1 (bottom) to +1 (top)
            "name":          visible_meta.at[i, "proper"] if visible_meta.at[i, "proper"] else None,
            "magnitude":     float(visible_meta.at[i, "mag"]),
            "constellation": visible_meta.at[i, "con"],
        }
        for i in range(len(visible_proj))
    ]

def build_led_frame(
    pixels: np.ndarray,
    visible_mask: np.ndarray,
    cols: int = 12,
    rows: int = 8
) -> np.ndarray:
    """
    Convert pixel positions into a boolean LED matrix frame.

    Parameters
    ----------
    pixels : np.ndarray, shape (N, 2)
        Output of get_led_view() or normalize_to_led_pixels().
    visible_mask : np.ndarray, shape (N,)
        Visibility mask from get_led_view().
    cols : int
        LED matrix columns.
    rows : int
        LED matrix rows.

    Returns
    -------
    frame : np.ndarray, shape (rows, cols), dtype bool
        True = LED on, False = LED off.
        Index as frame[row][col].
    """
    frame = np.zeros((rows, cols), dtype=bool)
    visible_pixels = pixels[visible_mask]
    for col, row in visible_pixels:
        if 0 <= row < rows and 0 <= col < cols:
            frame[row, col] = True
    return frame
