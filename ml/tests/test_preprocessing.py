import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.preprocessing import select_ml_features, clean_feature_matrix, CANDIDATE_ML_FEATURES


def _full_merged_row(**overrides):
    base = {c: 1.0 for c in CANDIDATE_ML_FEATURES}
    base["wallet_id"] = "a"
    base["community_id"] = 0
    base.update(overrides)
    return base


def test_select_ml_features_excludes_identifiers():
    df = pd.DataFrame([_full_merged_row()])
    feature_df, cols = select_ml_features(df)
    assert "wallet_id" not in feature_df.columns
    assert "community_id" not in feature_df.columns
    assert set(cols) == set(CANDIDATE_ML_FEATURES)


def test_select_ml_features_raises_on_missing_column():
    df = pd.DataFrame([{"wallet_id": "a", "community_id": 0, "pagerank": 0.1}])
    with pytest.raises(ValueError):
        select_ml_features(df)


def test_clean_feature_matrix_imputes_missing_with_median():
    df = pd.DataFrame({"x": [1.0, 2.0, np.nan, 4.0]})
    cleaned, report = clean_feature_matrix(df)
    assert not cleaned["x"].isna().any()
    assert cleaned["x"].iloc[2] == pytest.approx(2.0)  # median of [1,2,4]
    assert report["null_counts"]["x"] == 1


def test_clean_feature_matrix_handles_infinities():
    df = pd.DataFrame({"x": [1.0, np.inf, 3.0]})
    cleaned, report = clean_feature_matrix(df)
    assert not np.isinf(cleaned["x"]).any()
    assert report["infinite_values_replaced"] == 1


def test_clean_feature_matrix_flags_constant_columns():
    df = pd.DataFrame({"x": [5.0, 5.0, 5.0], "y": [1.0, 2.0, 3.0]})
    cleaned, report = clean_feature_matrix(df)
    assert "x" in report["constant_columns"]
    assert "y" not in report["constant_columns"]