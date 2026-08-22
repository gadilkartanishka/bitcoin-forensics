"""
N-hop neighborhood queries — the function Shreeja will likely wrap as
GET /graph/{entity} for Tanishka's investigation page ("everything
connected to this flagged wallet").
"""

import networkx as nx


def neighbors_within_hops(g: nx.DiGraph, node_id: str, hops: int = 2) -> dict:
    """
    node_id should be prefixed, e.g. 'wallet:wallet_007'.
    Returns the induced subgraph as a node/edge dict, undirected-hop
    distance (a transaction chain counts as hops even across direction).
    """
    if node_id not in g:
        raise ValueError(f"Node {node_id} not found in graph")

    undirected = g.to_undirected()
    lengths = nx.single_source_shortest_path_length(undirected, node_id, cutoff=hops)
    subgraph_nodes = list(lengths.keys())
    sub = g.subgraph(subgraph_nodes)

    return {
        "center": node_id,
        "hops": hops,
        "nodes": [
            {"id": n, "type": d.get("type"), "distance": lengths[n], **{
                k: v for k, v in d.items() if k not in ("type",)
            }}
            for n, d in sub.nodes(data=True)
        ],
        "edges": [
            {"source": u, "target": v, **d}
            for u, v, d in sub.edges(data=True)
        ],
    }


if __name__ == "__main__":
    from ingest import load_transactions
    from graph_builder import build_graph

    txs = load_transactions("data/sample/mock_transactions.json")
    g = build_graph(txs)
    sample_wallet = [n for n, d in g.nodes(data=True) if d.get("type") == "wallet"][0]

    result = neighbors_within_hops(g, sample_wallet, hops=2)
    print(f"{sample_wallet}: {len(result['nodes'])} nodes, {len(result['edges'])} edges within 2 hops")
