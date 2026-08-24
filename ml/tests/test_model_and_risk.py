import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.model import fit_isolation_forest
from ml.risk_scoring import compute_risk_scores, compute_risk_level, LOW_THRESHOLD, HIGH_THRESHOLD
from ml.explain import explain_wallets


def test_fit_isolation_forest_returns_score_per_row():
    rng = np.random.RandomState(0)
    df = pd.DataFrame(rng.normal(size=(50, 4)), columns=["a", "b", "c", "d"])
    model, scores = fit_isolation_forest(df, n_estimators=50, contamination=0.1, random_state=42)
    assert len(scores) == 50
    assert not np.isnan(scores).any()


def test_isolation_forest_flags_obvious_outlier_as_more_anomalous():
    rng = np.random.RandomState(0)
    normal = rng.normal(loc=0.0, scale=1.0, size=(49, 2))
    outlier = np.array([[1000.0, 1000.0]])
    data = np.vstack([normal, outlier])
    df = pd.DataFrame(data, columns=["a", "b"])
    model, scores = fit_isolation_forest(df, n_estimators=100, contamination=0.05, random_state=42)
    # higher raw_anomaly_score = more anomalous (per model.py docstring)
    assert scores[-1] == scores.max()


def test_compute_risk_scores_range_0_100():
    scores = np.array([0.1, 0.5, 0.9, 0.2, 0.7])
    risk = compute_risk_scores(scores)
    assert risk.min() >= 0
    assert risk.max() <= 100


def test_compute_risk_scores_ordering_preserved():
    scores = np.array([0.1, 0.9, 0.5])
    risk = compute_risk_scores(scores)
    # highest raw score -> highest risk_score
    assert risk.iloc[1] == risk.max()
    assert risk.iloc[0] == risk.min()


def test_compute_risk_level_thresholds():
    risk_score = pd.Series([0.0, LOW_THRESHOLD - 1, LOW_THRESHOLD, HIGH_THRESHOLD - 1, HIGH_THRESHOLD, 100.0])
    levels = compute_risk_level(risk_score)
    assert list(levels) == ["LOW", "LOW", "MEDIUM", "MEDIUM", "HIGH", "HIGH"]


def test_explain_wallets_returns_grounded_reasons():
    df = pd.DataFrame({
        "pagerank": [0.001, 0.002, 0.9],
        "unique_counterparties": [1, 2, 50],
    })
    wallet_ids = pd.Series(["a", "b", "c"])
    reasons = explain_wallets(df, wallet_ids, top_n=2)
    assert len(reasons) == 3
    # the extreme wallet (row 2) should have non-empty reasons mentioning its actual values
    assert len(reasons.iloc[2]) > 0
    assert "0.9" in reasons.iloc[2][0] or "unique_counterparties" in reasons.iloc[2][0] or "network importance" in reasons.iloc[2][0]


def test_explain_wallets_reasons_reference_real_values():
    df = pd.DataFrame({"total_sent": [1.0, 1.0, 100.0]})
    wallet_ids = pd.Series(["a", "b", "c"])
    reasons = explain_wallets(df, wallet_ids, top_n=1)
    assert "100" in reasons.iloc[2][0]