import pandas as pd
import json
from pathlib import Path
import ast

_DEFAULT_CSV = "python/assets/constellations.csv"


def load_constellations(csv_path=_DEFAULT_CSV) -> pd.DataFrame:
    df = pd.read_csv(Path(csv_path))
    df["hip_ids"] = df["hip_ids"].apply(json.loads)
    return df
