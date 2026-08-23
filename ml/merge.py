"""
Merges Osin's transaction-derived wallet features with Kshitij's
wallet-level graph feature table, joined on wallet_id.

Does NOT modify, rescale, or recompute Kshitij's values -- they are
merged in exactly as provided.
"""

from __future__ import annotations

import pandas as pd


class MergeValidationError(Exception):
    pass


def merge_wallet_features(
    tx_features: pd.DataFrame,
    graph_features: pd.DataFrame,
) -> pd.DataFrame:
    # --- Pre-merge validation ---
    tx_dupes = tx_features["wallet_id"].duplicated().sum()
    if tx_dupes > 0:
        raise MergeValidationError(
            f"Transaction-derived feature table has {tx_dupes} duplicate wallet_id rows."
        )

    graph_dupes = graph_features["wallet_id"].duplicated().sum()
    if graph_dupes > 0:
        raise MergeValidationError(
            f"Graph feature table has {graph_dupes} duplicate wallet_id rows."
        )

    tx_wallets = set(tx_features["wallet_id"])
    graph_wallets = set(graph_features["wallet_id"])

    only_in_tx = tx_wallets - graph_wallets
    only_in_graph = graph_wallets - tx_wallets

    coverage_report = {
        "tx_wallets": len(tx_wallets),
        "graph_wallets": len(graph_wallets),
        "common_wallets": len(tx_wallets & graph_wallets),
        "only_in_tx_features": len(only_in_tx),
        "only_in_graph_features": len(only_in_graph),
    }

    # An inner join is used deliberately: a wallet needs both transaction
    # context and graph context to be scored. If coverage isn't 1:1
    # (it was verified 1:1 for this dataset), this becomes visible in
    # the row count rather than silently producing NaN-filled rows.
    merged = pd.merge(tx_features, graph_features, on="wallet_id", how="inner")

    before_rows = len(merged)
    merged = merged.drop_duplicates(subset="wallet_id")
    after_rows = len(merged)
    if before_rows != after_rows:
        raise MergeValidationError(
            f"Merge produced {before_rows - after_rows} duplicate wallet_id rows "
            "-- unexpected row multiplication during merge."
        )

    expected_rows = coverage_report["common_wallets"]
    if len(merged) != expected_rows:
        raise MergeValidationError(
            f"Merged row count ({len(merged)}) does not match expected common "
            f"wallet count ({expected_rows})."
        )

    return merged, coverage_report