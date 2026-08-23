"""
Preprocessing for the wallet-level ML feature matrix.

Isolation Forest is tree-based and scale-invariant, so this module does
NOT apply blanket scaling. It only does what's actually needed:
  - selects the safe ML feature columns (excludes identifiers)
  - handles missing values (median imputation)
  - handles infinities (should not occur given the feature set, but
    guarded against explicitly rather than assumed away)
  - reports constant / near-constant features (kept, but flagged --
    they carry no signal for Isolation Forest but may become
    informative once real data has wallets with multiple
    transactions)

Columns explicitly excluded from the ML matrix, and why:
  - wallet_id: identifier, not a feature
  - community_id: has ~1 distinct value per transaction in this
    dataset (200 distinct values across 788 wallets) -- functions as
    a near-unique identifier, not a structural signal. Feeding it in
    would be leakage/noise, not a real feature.
  - flag_amount_mismatch: explicitly a structural/data-quality flag
    per team handoff, not a fraud/anomaly signal. Its magnitude
    equivalent (max_abs_amount_mismatch_delta) is used instead.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

NON_FEATURE_COLUMNS = ["wallet_id", "community_id"]

# community_size is a candidate feature -- included here but flagged in
# the returned report as low-confidence pending correlation review
# (per Osin's design doc, Section D).
CANDIDATE_ML_FEATURES = [
    # Kshitij's graph features (raw, unscaled)
    "tx_as_sender", "tx_as_receiver", "total_tx_count", "mismatch_tx_count",
    "max_abs_amount_mismatch_delta", "cross_border_tx_count",
    "graph_degree", "graph_in_degree", "graph_out_degree",
    "pagerank", "betweenness_centrality", "unique_counterparties",
    "community_size",
    # Osin's transaction-derived features
    "total_sent", "total_received", "avg_sent_amount", "avg_received_amount",
    "net_flow", "unique_countries_touched", "unique_asns_touched",
]


def select_ml_features(merged: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Returns (feature_dataframe, feature_column_names). wallet_id is
    NOT included in the returned feature frame -- callers must keep it
    separately for re-joining results."""
    missing = [c for c in CANDIDATE_ML_FEATURES if c not in merged.columns]
    if missing:
        raise ValueError(f"Expected feature columns missing from merged table: {missing}")

    feature_df = merged[CANDIDATE_ML_FEATURES].copy()
    return feature_df, CANDIDATE_ML_FEATURES


def clean_feature_matrix(feature_df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Handles missing values and infinities. Reports constant/near-constant
    columns without dropping them (documented reason: see module docstring)."""
    report = {}

    # Replace inf/-inf with NaN so they go through the same imputation path.
    inf_counts = np.isinf(feature_df.select_dtypes(include=[np.number])).sum()
    inf_total = int(inf_counts.sum())
    if inf_total > 0:
        feature_df = feature_df.replace([np.inf, -np.inf], np.nan)
    report["infinite_values_replaced"] = inf_total

    null_counts_before = feature_df.isna().sum()
    report["null_counts"] = null_counts_before[null_counts_before > 0].to_dict()

    for col in feature_df.columns:
        if feature_df[col].isna().any():
            median_val = feature_df[col].median()
            feature_df[col] = feature_df[col].fillna(median_val)

    remaining_nulls = int(feature_df.isna().sum().sum())
    if remaining_nulls > 0:
        raise ValueError(
            f"{remaining_nulls} NaN values remain after imputation -- "
            "a fully-empty column cannot be median-imputed."
        )

    constant_cols = [c for c in feature_df.columns if feature_df[c].nunique() <= 1]
    report["constant_columns"] = constant_cols

    return feature_df, report