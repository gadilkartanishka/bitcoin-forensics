"""
Deterministic, value-grounded explanations for each wallet.

No SHAP in v1 (disproportionate complexity for a hackathon timeline
and audience -- see design doc). Instead: for each wallet, find the
features where it deviates most from the population, expressed as a
percentile within the current feature matrix, and turn the strongest
2-3 deviations into human-readable strings.

Every reason string is built directly from an actual feature value and
an actual population statistic computed from the real feature matrix
-- nothing here is invented or hardcoded per-wallet.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# Human-readable labels and directionality for explanation text.
# "high_is_notable" = True means a HIGH value of this feature is the
# interesting direction to call out (true for every feature we use
# here -- e.g. we care about unusually HIGH mismatch, not unusually low).
FEATURE_LABELS = {
    "tx_as_sender": "number of times wallet acted as a sender",
    "tx_as_receiver": "number of times wallet acted as a receiver",
    "max_abs_amount_mismatch_delta": "magnitude of transaction amount mismatch",
    "cross_border_tx_count": "number of cross-border transactions",
    "graph_degree": "graph connectivity (degree)",
    "graph_in_degree": "graph in-degree",
    "graph_out_degree": "graph out-degree",
    "pagerank": "network importance (PageRank)",
    "betweenness_centrality": "network bridging role (betweenness centrality)",
    "unique_counterparties": "number of unique counterparties",
    "community_size": "size of the wallet's local transaction community",
    "total_sent": "total BTC sent",
    "total_received": "total BTC received",
    "avg_sent_amount": "average BTC amount sent per transaction",
    "avg_received_amount": "average BTC amount received per transaction",
    "net_flow": "net BTC flow (received minus sent)",
    "unique_countries_touched": "number of distinct countries touched",
    "unique_asns_touched": "number of distinct ASNs touched",
}


def explain_wallets(
    feature_df: pd.DataFrame,
    wallet_ids: pd.Series,
    top_n: int = 3,
) -> pd.Series:
    """Returns a Series of lists of human-readable reason strings, one
    list per wallet, aligned by position with feature_df / wallet_ids."""
    percentiles = feature_df.rank(pct=True) * 100  # per-column percentile, 0-100

    medians = feature_df.median()

    reasons_per_wallet = []
    for idx in range(len(feature_df)):
        row_pct = percentiles.iloc[idx]
        row_val = feature_df.iloc[idx]

        # Rank this wallet's features by how extreme (high) their
        # percentile is. Only features where the wallet is above the
        # population median are candidates -- "unusually low" isn't a
        # meaningful anomaly signal for any feature in this set.
        candidates = row_pct[row_val > medians].sort_values(ascending=False)

        reasons = []
        for feat_name in candidates.index[:top_n]:
            label = FEATURE_LABELS.get(feat_name, feat_name)
            actual_value = row_val[feat_name]
            pct = row_pct[feat_name]
            median_val = medians[feat_name]
            reasons.append(
                f"{label}: {actual_value:.4g} "
                f"(higher than {pct:.0f}% of wallets; population median {median_val:.4g})"
            )
        reasons_per_wallet.append(reasons)

    return pd.Series(reasons_per_wallet, name="reasons", index=wallet_ids.index)