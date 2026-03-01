import pandas as pd
import numpy as np
from pathlib import Path

def load_star_xyz() -> np.ndarray:
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
    df = pd.read_csv(Path('/app/python/assets/named_stars.csv'), usecols=["x", "y", "z"])
    star_xyz = df.to_numpy(dtype=float)
    return star_xyz

def load_star_df() -> pd.DataFrame:
    return pd.read_csv(Path('/app/python/assets/named_stars.csv'))

if __name__ == "__main__":
    print(load_star_xyz('/Users/aish/Documents/Workspace/Hackathons/IrvineHacks2026/viewfinder/backend/src/assets/named_stars.csv'))