import pandas as pd
import numpy as np
from pathlib import Path

_DEFAULT_CSV = "python/assets/stars.csv"


def load_star_xyz(csv_path=_DEFAULT_CSV) -> np.ndarray:
    df = pd.read_csv(Path(csv_path), usecols=["x", "y", "z"])
    return df.to_numpy(dtype=float)


def load_star_df(csv_path=_DEFAULT_CSV) -> pd.DataFrame:
    return pd.read_csv(Path(csv_path))
