"""
Exports the wallet feature table for Osin's ML pipeline. One row per
wallet_id — he merges this with his own transaction-based features
(amount variance, frequency, etc.) on that key before training.
"""

from features import compute_wallet_features


def export_feature_table(g, out_path: str = "data/sample/wallet_features_sample.csv"):
    df = compute_wallet_features(g)
    df.to_csv(out_path, index=False)
    return df


if __name__ == "__main__":
    from ingest import load_transactions
    from graph_builder import build_graph

    txs = load_transactions("data/sample/mock_transactions.json")
    g = build_graph(txs)
    df = export_feature_table(g)
    print(f"Exported {len(df)} wallet feature rows to data/sample/wallet_features_sample.csv")
