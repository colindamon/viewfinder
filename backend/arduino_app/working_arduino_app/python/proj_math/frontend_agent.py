"""
frontend_agent.py — Viewfinder
--------------------------------
Frontend-facing helpers for the star rendering pipeline.

Consumes pre-rotated camera-space coordinates (from rotation_agent) and
star metadata (from read_data) to produce JSON-serialisable payloads for
the React frontend.
"""

import math
import numpy as np
from .rotation_agent import project_to_normalized_2d


# ---------------------------------------------------------------------------
# Star display utilities
# ---------------------------------------------------------------------------

def _magnitude_to_radius(mag: float, min_radius: float = 1.0, max_radius: float = 6.0) -> float:
    MAG_BRIGHTEST = -1.5
    MAG_FAINTEST = 6.5
    mag_clamped = max(MAG_BRIGHTEST, min(MAG_FAINTEST, mag))
    normalised = (MAG_FAINTEST - mag_clamped) / (MAG_FAINTEST - MAG_BRIGHTEST)
    return min_radius + normalised * (max_radius - min_radius)


def _ci_to_hex_color(ci: float) -> str:
    if ci is None or (isinstance(ci, float) and math.isnan(ci)):
        return "#ffffff"
    CI_MIN, CI_MAX = -0.4, 2.0
    ci_clamped = max(CI_MIN, min(CI_MAX, ci))
    t = (ci_clamped - CI_MIN) / (CI_MAX - CI_MIN)
    stops = [
        (0.00, 155, 176, 255),
        (0.17, 255, 255, 255),
        (0.44, 255, 244, 232),
        (0.79, 255, 210, 161),
        (1.00, 255, 112, 16),
    ]
    for i in range(len(stops) - 1):
        t0, r0, g0, b0 = stops[i]
        t1, r1, g1, b1 = stops[i + 1]
        if t <= t1:
            blend = (t - t0) / (t1 - t0)
            r = int(r0 + blend * (r1 - r0))
            g = int(g0 + blend * (g1 - g0))
            b = int(b0 + blend * (b1 - b0))
            return f"#{r:02x}{g:02x}{b:02x}"
    return "#ffffff"


# ---------------------------------------------------------------------------
# Frontend output functions
# ---------------------------------------------------------------------------

def get_frontend_stars(camera_coords, star_df, fov_deg=60.0):
    """
    Project pre-rotated camera-space coordinates to a frontend-ready star list.

    Unlike the rotation_agent version, this accepts already-transformed
    camera_coords so the rotation matrix multiply is never duplicated.

    Parameters
    ----------
    camera_coords : np.ndarray, shape (N, 3)
        Stars already in camera space (output of transform_stars_to_camera).
    star_df : pd.DataFrame
        Star metadata aligned row-for-row with camera_coords.
        Expected columns: "hip", "proper", "mag", "ci" (ci optional).
    fov_deg : float
        Field of view in degrees (default 60).

    Returns
    -------
    list[dict] — visible stars with x, y, name, hip, radius, color.
    """
    projected, visible_mask = project_to_normalized_2d(camera_coords, fov_deg)

    vis_idx = np.where(visible_mask)[0]
    if len(vis_idx) == 0:
        return []

    vis_x = projected[vis_idx, 0]
    vis_y = projected[vis_idx, 1]
    vis_df = star_df.iloc[vis_idx]

    names = vis_df["proper"].values
    hip_col = "hip" if "hip" in vis_df.columns else "id"
    hips = vis_df[hip_col].values.astype(int)
    mags = vis_df["mag"].values

    has_ci = "ci" in vis_df.columns
    cis = vis_df["ci"].values if has_ci else None

    # Vectorised magnitude → radius
    mag_clamped = np.clip(mags, -1.5, 6.5)
    radii = 1.0 + ((6.5 - mag_clamped) / 8.0) * 5.0

    result = []
    for i in range(len(vis_idx)):
        name = names[i]
        name_str = None
        if name is not None and not (isinstance(name, float) and math.isnan(name)):
            s = str(name)
            if s and s != "nan":
                name_str = s

        ci_val = float(cis[i]) if has_ci else float("nan")
        color = _ci_to_hex_color(ci_val)

        result.append({
            "x": float(vis_x[i]),
            "y": float(vis_y[i]),
            "name": name_str,
            "hip": int(hips[i]),
            "radius": float(radii[i]),
            "color": color,
        })

    return result


# ---------------------------------------------------------------------------
# Catalog helpers (static data served once to the frontend)
# ---------------------------------------------------------------------------

def star_names(star_df):
    """Return [{name, hip}, ...] for every star that has a proper name."""
    hip_col = "hip" if "hip" in star_df.columns else "id"
    mask = star_df["proper"].notna() & (star_df["proper"] != "")
    named = star_df.loc[mask, [hip_col, "proper"]]
    return [
        {"name": row["proper"], "hip": int(row[hip_col])}
        for _, row in named.iterrows()
    ]


def constellation_names(constellations_df):
    """Return [{constellation_id, name, first_hip}, ...] for the sidebar."""
    result = []
    for _, row in constellations_df.iterrows():
        hip_ids = row["hip_ids"]
        first_hip = hip_ids[0] if isinstance(hip_ids, list) and hip_ids else None
        result.append({
            "constellation_id": row["constellation_id"],
            "name": row["constellation_name"],
            "first_hip": first_hip,
        })
    return result


def get_all_constellations(constellations_df):
    """Return full constellation line data for StarMap rendering."""
    result = []
    for _, row in constellations_df.iterrows():
        hip_ids = row["hip_ids"]
        result.append({
            "constellation_id": row["constellation_id"],
            "name": row["constellation_name"],
            "hip_ids": hip_ids if isinstance(hip_ids, list) else [],
        })
    return result


def get_visible_constellations(constellations_df, visible_hips):
    """Return only constellations with at least one visible star."""
    all_cons = get_all_constellations(constellations_df)
    hip_set = set(visible_hips)
    return [c for c in all_cons if any(h in hip_set for h in c["hip_ids"])]
