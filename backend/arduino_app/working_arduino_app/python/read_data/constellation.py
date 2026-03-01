import pandas as pd
import numpy as np
from pathlib import Path
import ast

csv_path = "python/assets/constellations.csv"

def load_constellations() -> pd.DataFrame:
    df = pd.read_csv(Path(csv_path), usecols=["constellation_id", "constellation_name", "hip_ids"])
    df["hip_ids"] = df["hip_ids"].apply(ast.literal_eval)
    return df