import pandas as pd
import numpy as np
from pathlib import Path

def load_star_xyz(csv_path: Path) -> np.ndarray:
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
    df = pd.read_csv(csv_path, usecols=["x", "y", "z"])
    star_xyz = df.to_numpy(dtype=float)
    return star_xyz

if __name__ == "__main__":
    print(load_star_xyz(Path('/Users/aish/Documents/Workspace/Hackathons/IrvineHacks2026/viewfinder/backend/src/assets/named_stars.csv')))