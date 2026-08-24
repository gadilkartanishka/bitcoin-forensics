"""
Converts Isolation Forest raw anomaly scores into a 0-100 risk_score
and a LOW/MEDIUM/HIGH risk_level.

Uses PERCENTILE RANK within the current wallet population rather than
min-max scaling or calling it a probability:
  - min-max scaling is sensitive to single extreme outliers distorting
    every other wallet's score
  - percentile rank is stable, always well-distributed across 0-100,
    and is honestly describable as "more anomalous than N% of other
    wallets in this batch" -- which is what it actually is

IMPORTANT: risk_score and risk_level are RELATIVE ANOMALY RANKINGS
within this specific dataset, not calibrated fraud probabilities.
There is no ground-truth fraud label to calibrate against. The
LOW/MEDIUM/HIGH thresholds below are heuristic prototype defaults, not
validated risk boundaries.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import rankdata

LOW_THRESHOLD = 40   # risk_score < 40 -> LOW
HIGH_THRESHOLD = 70  # risk_score >= 70 -> HIGH


def compute_risk_scores(raw_anomaly_score: np.ndarray) -> pd.Series:
    """Percentile rank (0-100), higher = more anomalous."""
    n = len(raw_anomaly_score)
    if n == 0:
        return pd.Series(dtype=float)
    ranks = rankdata(raw_anomaly_score, method="average")  # 1..n, ties averaged
    percentile = (ranks - 1) / (n - 1) * 100 if n > 1 else np.zeros(n)
    return pd.Series(percentile, name="risk_score")


def compute_risk_level(risk_score: pd.Series) -> pd.Series:
    def level(score: float) -> str:
        if score >= HIGH_THRESHOLD:
            return "HIGH"
        elif score >= LOW_THRESHOLD:
            return "MEDIUM"
        else:
            return "LOW"

    return risk_score.apply(level).rename("risk_level")