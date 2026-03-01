import pandas as pd
import numpy as np
from pathlib import Path

def load_constellations(csv_path: str) -> np.ndarray:
    
    df = pd.read_csv(Path(csv_path), usecols=["constellation_id","constellation_name","num_stars","hip_ids"])
    constellations = df.to_numpy(dtype=float)
    return constellations