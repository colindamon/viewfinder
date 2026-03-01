"""
frontend_agent.py — Viewfinder
--------------------------------
Frontend-facing output functions and star display utilities.

Consumes orientation data from orientation.py and projection results
from rotation_agent.py to produce JSON-serialisable payloads for the
React frontend.

Imports
-------
    from rotation_agent import _project_stars
"""

import math
import numpy as np
from .rotation_agent import _project_stars
import pandas as pd


# ---------------------------------------------------------------------------
# Star display utilities
# ---------------------------------------------------------------------------

def _magnitude_to_radius(mag: float) -> float:
    """
    Convert HYG apparent magnitude to a normalised radius for the frontend.

    Magnitude is an inverted logarithmic scale — brighter stars have smaller
    (more negative) values. We clamp to the naked-eye visible range (-1.5 to
    6.5), invert so brighter = larger radius, then normalise to [0.0, 1.0]
    so the frontend can scale it to whatever pixel size it needs.

    Parameters
    ----------
    mag : float
        Apparent magnitude from HYG "mag" column.

    Returns
    -------
    float
        Normalised radius in the range [0.0, 1.0].
        0.0 = faintest naked-eye stars, 1.0 = brightest stars like Sirius.
    """
    MAG_BRIGHTEST = -1.5   # Sirius and the very brightest stars
    MAG_FAINTEST  =  6.5   # naked-eye limit

    # Clamp to the visible range
    mag_clamped = max(MAG_BRIGHTEST, min(MAG_FAINTEST, mag))

    # Invert: faint (6.5) → 0.0, bright (-1.5) → 1.0
    return (MAG_FAINTEST - mag_clamped) / (MAG_FAINTEST - MAG_BRIGHTEST)


def _ci_to_hex_color(ci: float) -> str:
    """
    Convert a HYG B-V color index to a human-perceptible hex color.

    B-V range: -0.4 (blue-white, ~40,000 K) to +2.0 (deep red, ~2,000 K).
    Notable reference points:
        -0.4  → blue-white  (#9bb4ff)  O/B-type stars e.g. Rigel
         0.0  → white       (#ffffff)  A-type, Vega
        +0.65 → yellow      (#fff4e0)  G-type, the Sun
        +1.5  → orange-red  (#ffcc6f)  K/M-type e.g. Arcturus
        +2.0  → deep red    (#ff7000)  M-type e.g. Betelgeuse

    NaN is treated as unknown and returns white (#ffffff) as a safe default.

    Parameters
    ----------
    ci : float
        B-V color index from HYG "ci" column. May be NaN for some stars.

    Returns
    -------
    str
        Hex color string e.g. "#ff7000".
    """
    # NaN fallback — many HYG entries lack CI data
    if ci is None or (isinstance(ci, float) and math.isnan(ci)):
        return "#ffffff"

    CI_MIN = -0.4   # bluest stars
    CI_MAX =  2.0   # reddest stars

    # Clamp to known range
    ci_clamped = max(CI_MIN, min(CI_MAX, ci))

    # Normalise to [0, 1]:  0 = blue end, 1 = red end
    t = (ci_clamped - CI_MIN) / (CI_MAX - CI_MIN)

    # Colour stops across the B-V range (t, R, G, B)
    stops = [
        (0.00, 155, 176, 255),   # -0.4  blue-white
        (0.17, 255, 255, 255),   #  0.0  white (Vega)
        (0.44, 255, 244, 232),   # +0.65 pale yellow (Sun)
        (0.79, 255, 210, 161),   # +1.5  orange
        (1.00, 255, 112,  16),   # +2.0  deep red
    ]

    # Find which two stops we're between and linearly interpolate
    for i in range(len(stops) - 1):
        t0, r0, g0, b0 = stops[i]
        t1, r1, g1, b1 = stops[i + 1]
        if t <= t1:
            blend = (t - t0) / (t1 - t0)
            r = int(r0 + blend * (r1 - r0))
            g = int(g0 + blend * (g1 - g0))
            b = int(b0 + blend * (b1 - b0))
            return f"#{r:02x}{g:02x}{b:02x}"

    return "#ffffff"  # fallback to white, should never be reached


# ---------------------------------------------------------------------------
# Frontend output functions
# ---------------------------------------------------------------------------

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
        Expected columns: "proper", "mag", "ci", "con".
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
        "name"          : str or None — proper name if one exists in HYG
        "x"             : float, normalised -1 (left) to +1 (right)
        "y"             : float, normalised -1 (bottom) to +1 (top)
        "radius"        : float — dot size for rendering, range [1.0, 6.0],
                          derived from magnitude (brighter = larger)
        "color"         : str — hex color derived from B-V color index,
                          e.g. "#ffffff" for white, "#ff7000" for deep red
    """
    projected, visible_mask = _project_stars(star_xyz, yaw_deg, pitch_deg, roll_deg, fov_deg)
    visible_proj = projected[visible_mask]
    visible_meta = star_df[visible_mask].reset_index(drop=True)

    return [
        {
            "name":   visible_meta.at[i, "proper"] if visible_meta.at[i, "proper"] else None,
            "x":      float(visible_proj[i, 0]),
            "y":      float(visible_proj[i, 1]),
            "radius": _magnitude_to_radius(visible_meta.at[i, "mag"]),
            "color":  _ci_to_hex_color(visible_meta.at[i, "ci"]),
            "hip":    int(visible_meta.at[i, "hip"])
        }
        for i in range(len(visible_proj))
    ]

def get_visible_constellations(constellations, visible_stars: list) -> list:
    visible_hips = {star["hip"] for star in visible_stars if star.get("hip") is not None}

    return [
        {
            "constellation_id": row["constellation_id"],
            "name":             row["constellation_name"],
            "hip_ids":          row["hip_ids"],
        }
        for _, row in constellations.iterrows()
        if visible_hips.intersection(row["hip_ids"])
    ]

def star_names(star_df: pd.DataFrame) -> list:
    return [
        {
            "hip":  int(row["hip"]),
            "name": row["proper"] if pd.notna(row["proper"]) else None,
        }
        for _, row in star_df.iterrows()
        if pd.notna(row["hip"])
    ]


def constellation_names(constellations: np.ndarray) -> list:
    """
    Parameters
    ----------
    constellations : np.ndarray
        Output of load_constellations(). Expected columns: "constellation_id", "constellation_name".

    Returns
    -------
    list of dicts:
        { "constellation_id": str, "name": str }
    """
    return [
        {
            "constellation_id": row["constellation_id"],
            "name":             row["constellation_name"],
        }
        for _, row in constellations.iterrows()
    ]