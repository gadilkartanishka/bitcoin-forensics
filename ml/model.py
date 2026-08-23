"""
Isolation Forest anomaly detection.

Score direction (sklearn convention, documented explicitly so nothing
downstream gets the sign backwards):
  - `IsolationForest.decision_function()` returns HIGHER values for
    NORMAL points and LOWER (more negative) values for ANOMALIES.
  - `IsolationForest.score_samples()` follows the same convention
    (it's decision_function shifted by offset_).

This module inverts that so `raw_anomaly_score` is HIGHER = MORE
ANOMALOUS, which is the convention the rest of this pipeline
(risk_scoring.py) expects and is more intuitive downstream.

This is unsupervised anomaly detection with no ground-truth fraud
labels. `contamination` is a prototype assumption about what fraction
of wallets we roughly expect to look anomalous -- it is NOT a
validated real-world fraud rate.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


def fit_isolation_forest(
    feature_df: pd.DataFrame,
    n_estimators: int = 100,
    contamination: float = 0.05,
    random_state: int = 42,
    max_samples: str | int = "auto",
) -> tuple[IsolationForest, np.ndarray]:
    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=random_state,
        max_samples=max_samples,
    )
    model.fit(feature_df.values)

    # sklearn: lower score_samples = more anomalous. Invert sign so
    # higher raw_anomaly_score = more anomalous for the rest of the
    # pipeline.
    sklearn_scores = model.score_samples(feature_df.values)
    raw_anomaly_score = -sklearn_scores

    return model, raw_anomaly_score