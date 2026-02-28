import pandas as pd
import numpy as np
from pathlib import Path

def load_star_xyz(csv_path: str) -> np.ndarray:
    """
    Load star positions from a CSV into a NumPy array.

    Parameters
    ----------
    csv_path : str
        Path to the CSV file with columns: id, proper, x, y, z, mag, ci.

    Returns
    -------
    star_xyz : np.ndarray, shape (N, 3)
        HYG x, y, z columns for N stars.
    """
    df = pd.read_csv(Path(csv_path), usecols=["x", "y", "z"])
    star_xyz = df.to_numpy(dtype=float)
    return star_xyz


def load_star_df(csv_path: str) -> pd.DataFrame:
    """
    Load star metadata from a CSV into a DataFrame for use with frontend_agent.py.

    Extracts only the columns needed for frontend rendering. Column names are
    kept as-is from HYG — frontend_agent.py expects "proper", "mag", "ci", "con".
    Renaming to "name", "radius", "color" happens downstream in _magnitude_to_radius()
    and _ci_to_hex_color() at the point of serialisation.

    Parameters
    ----------
    csv_path : str
        Path to the CSV file with columns: id, proper, mag, ci, con.

    Returns
    -------
    star_df : pd.DataFrame
        DataFrame with columns: id, proper, mag, ci.
        Row order matches load_star_xyz() — both must be loaded from the
        same CSV to stay aligned with star_xyz.
    """
    star_df = pd.read_csv(Path(csv_path), usecols=["id", "proper", "mag", "ci"])
    return star_df


def get_star_xyz_by_id(star_id: int, star_df: pd.DataFrame, star_xyz: np.ndarray) -> np.ndarray:
    """
    Look up a single star's world-space coordinates by HYG id.

    Uses star_df to find the row index of the target star, then slices
    star_xyz at that index. This works because both are always loaded from
    the same CSV in the same row order via load_star_xyz() and load_star_df().

    Parameters
    ----------
    star_id : int
        The HYG id of the target star.
    star_df : pd.DataFrame
        Output of load_star_df(). Must contain "id" column.
    star_xyz : np.ndarray, shape (N, 3)
        Output of load_star_xyz(). Row-aligned with star_df.

    Returns
    -------
    np.ndarray, shape (3,)
        The star's x, y, z coordinates, or None if id not found.
    """
    matches = star_df.index[star_df["id"] == star_id].tolist()
    if not matches:
        return None
    return star_xyz[matches[0]]


if __name__ == "__main__":
    print(load_star_xyz('/Users/aish/Documents/Workspace/Hackathons/IrvineHacks2026/viewfinder/backend/src/assets/named_stars.csv'))
