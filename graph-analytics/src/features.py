"""
Computes per-wallet graph features for Osin's ML pipeline.

Runs on the wallet-to-wallet PROJECTION (see graph_builder.py) since
centrality/PageRank are conventionally defined over a single node type,
not a mixed wallet/tx/ip bipartite graph. Degree counts, however, are
computed on the full bipartite graph so "number of distinct
transactions touching this wallet" is accurate.
"""

import networkx as nx
import pandas as pd

from graph_builder import wallet_to_wallet_projection


def compute_wallet_features(g: nx.DiGraph) -> pd.DataFrame:
    wallet_nodes = [n for n, d in g.nodes(data=True) if d.get("type") == "wallet"]
    wg = wallet_to_wallet_projection(g)

    pagerank = nx.pagerank(wg) if wg.number_of_nodes() > 0 else {}
    betweenness = nx.betweenness_centrality(wg) if wg.number_of_nodes() > 0 else {}

    rows = []
    for wallet in wallet_nodes:
        n_funded = g.out_degree(wallet)   
        n_received = g.in_degree(wallet)  

        touched_txs = set(g.successors(wallet)) | set(g.predecessors(wallet))
        mismatch_tx_count = sum(
            1 for tx_node in touched_txs
            if g.nodes[tx_node].get("flag_amount_mismatch")
        )
        mismatch_deltas = [
            abs(g.nodes[tx_node].get("amount_mismatch_delta") or 0.0)
            for tx_node in touched_txs
        ]
        max_abs_mismatch_delta = max(mismatch_deltas) if mismatch_deltas else 0.0

        cross_border_tx_count = 0
        for tx_node in touched_txs:
            in_ips = [n for n in g.predecessors(tx_node) if g.nodes[n].get("type") == "ip"]
            out_ips = [n for n in g.successors(tx_node) if g.nodes[n].get("type") == "ip"]
            src_countries = {g.nodes[n].get("country") for n in in_ips}
            dst_countries = {g.nodes[n].get("country") for n in out_ips}
            if src_countries and dst_countries and src_countries != dst_countries:
                cross_border_tx_count += 1

        row = {
            "wallet_id": wallet.replace("wallet:", ""),
            "tx_as_sender": n_funded,
            "tx_as_receiver": n_received,
            "total_tx_count": n_funded + n_received,
            "mismatch_tx_count": mismatch_tx_count,
            "max_abs_amount_mismatch_delta": max_abs_mismatch_delta,
            "cross_border_tx_count": cross_border_tx_count,
            "graph_degree": wg.degree(wallet) if wallet in wg else 0,
            "graph_in_degree": wg.in_degree(wallet) if wallet in wg else 0,
            "graph_out_degree": wg.out_degree(wallet) if wallet in wg else 0,
            "pagerank": pagerank.get(wallet, 0.0),
            "betweenness_centrality": betweenness.get(wallet, 0.0),
            "unique_counterparties": (
                len(set(wg.predecessors(wallet)) | set(wg.successors(wallet)))
                if wallet in wg else 0
            ),
        }
        rows.append(row)

    return pd.DataFrame(rows)


if __name__ == "__main__":
    from ingest import load_transactions
    from graph_builder import build_graph

    txs = load_transactions("data/sample/mock_transactions.json")
    g = build_graph(txs)
    df = compute_wallet_features(g)
    print(df.sort_values("pagerank", ascending=False).head(10))
