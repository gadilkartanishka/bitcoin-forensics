"""
Exports the graph as {nodes: [...], edges: [...]} JSON for Tanushri's
interactive visualization. Share this shape with her early and adjust
together — don't build this in isolation.
"""

import json

import networkx as nx

from graph_builder import wallet_to_wallet_projection
from features import compute_communities


def export_for_viz(g: nx.DiGraph, risk_scores: dict[str, float] | None = None) -> dict:
    """
    risk_scores: optional {wallet_id (unprefixed): anomaly_score} from
    Osin's model, merged in so Tanushri can color/highlight nodes
    without a second lookup.
    """
    risk_scores = risk_scores or {}
    community_map = compute_communities(wallet_to_wallet_projection(g))
    nodes = []
    for n, d in g.nodes(data=True):
        node_type = d.get("type")
        entry = {"id": n, "type": node_type}
        if node_type == "wallet":
            wallet_id = n.replace("wallet:", "")
            entry["label"] = wallet_id
            entry["risk_score"] = risk_scores.get(wallet_id)
            entry["community_id"] = community_map.get(n, -1)
        elif node_type == "ip":
            entry["label"] = n.replace("ip:", "")
            entry["country"] = d.get("country")
            entry["asn"] = d.get("asn")
        elif node_type == "transaction":
            entry["label"] = n.replace("tx:", "")[:8]
            entry["timestamp"] = d.get("timestamp")
            entry["flag_amount_mismatch"] = d.get("flag_amount_mismatch", False)
            entry["amount_mismatch_delta"] = d.get("amount_mismatch_delta", 0.0)
            entry["fee"] = d.get("fee")
            entry["script_type"] = d.get("script_type")
        nodes.append(entry)

    edges = [
        {"source": u, "target": v, "relation": d.get("relation"), "amount": d.get("amount")}
        for u, v, d in g.edges(data=True)
    ]

    return {"nodes": nodes, "edges": edges}


if __name__ == "__main__":
    from ingest import load_transactions
    from graph_builder import build_graph

    txs = load_transactions("data/sample/mock_transactions.json")
    g = build_graph(txs)
    viz = export_for_viz(g)
    print(f"Exported {len(viz['nodes'])} nodes, {len(viz['edges'])} edges")
    with open("data/sample/viz_export_sample.json", "w") as f:
        json.dump(viz, f, indent=2)
