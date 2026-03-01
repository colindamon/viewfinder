import pandas as pd
import numpy as np
from pathlib import Path

_DEFAULT_CSV = "python/assets/named_stars.csv"


def load_star_xyz(csv_path=_DEFAULT_CSV) -> np.ndarray:
    df = pd.read_csv(Path(csv_path), usecols=["x", "y", "z"])
    return df.to_numpy(dtype=float)


def load_star_df(csv_path=_DEFAULT_CSV) -> pd.DataFrame:
    star_df = pd.read_csv(Path(csv_path))
    if "id" in star_df.columns and "hip" not in star_df.columns:
        star_df = star_df.rename(columns={"id": "hip"})
    return star_df
