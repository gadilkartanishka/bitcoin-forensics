"""
Builds the entity/transaction graph.

DESIGN DECISION (the one that matters most): a transaction can have
MULTIPLE input wallets and MULTIPLE output wallets. We model each
transaction as its own NODE (not a simple wallet-to-wallet edge), so:

    wallet_A --funds--> TX1 --pays--> wallet_C
    wallet_B --funds--> TX1 --pays--> wallet_D

This is the only representation that doesn't lose information when
n_inputs > 1 or n_outputs > 1. A flattened wallet-to-wallet model would
have to arbitrarily pick which input "caused" which output, which is
wrong and would corrupt every downstream centrality/degree metric.

Node types: "wallet", "transaction", "ip"
Edge types:
    wallet -> transaction   (funds, amount=input_amount)
    transaction -> wallet   (pays, amount=output_amount)
    ip -> transaction       (broadcast_from)
    transaction -> ip       (broadcast_to)
"""

import networkx as nx


def build_graph(transactions: list[dict]) -> nx.DiGraph:
    g = nx.DiGraph()

    for tx in transactions:
        tx_node = f"tx:{tx['txid']}"
        g.add_node(
            tx_node,
            type="transaction",
            timestamp=tx["timestamp"],
            fee=tx.get("fee"),
            script_type=tx.get("script_type"),
            flag_amount_mismatch=tx.get("flag_amount_mismatch", False),
            amount_mismatch_delta=tx.get("amount_mismatch_delta", 0.0),
        )

        for addr, amount in zip(tx["input_addresses"], tx["input_amounts"]):
            wallet_node = f"wallet:{addr}"
            g.add_node(wallet_node, type="wallet")
            g.add_edge(wallet_node, tx_node, relation="funds", amount=amount)

        for addr, amount in zip(tx["output_addresses"], tx["output_amounts"]):
            wallet_node = f"wallet:{addr}"
            g.add_node(wallet_node, type="wallet")
            g.add_edge(tx_node, wallet_node, relation="pays", amount=amount)

        src_ip_node = f"ip:{tx['src_ip']}"
        dst_ip_node = f"ip:{tx['dst_ip']}"
        g.add_node(src_ip_node, type="ip",
                   country=tx.get("src_geo_country"), asn=tx.get("src_asn"))
        g.add_node(dst_ip_node, type="ip",
                   country=tx.get("dst_geo_country"), asn=tx.get("dst_asn"))
        g.add_edge(src_ip_node, tx_node, relation="broadcast_from")
        g.add_edge(tx_node, dst_ip_node, relation="broadcast_to")

    return g


def wallet_to_wallet_projection(g: nx.DiGraph) -> nx.DiGraph:
    """
    Optional derived view: collapse the bipartite graph into a direct
    wallet -> wallet flow graph, for simpler visualizations that don't
    need to show TX nodes explicitly. Edge weight = number of TXs
    connecting the pair. This is LOSSY (drops per-tx amount detail) —
    use the full graph for feature computation, this only for display.
    """
    wallet_graph = nx.DiGraph()
    tx_nodes = [n for n, d in g.nodes(data=True) if d.get("type") == "transaction"]

    for tx_node in tx_nodes:
        inputs = list(g.predecessors(tx_node))
        outputs = list(g.successors(tx_node))
        for i in inputs:
            if g.nodes[i].get("type") != "wallet":
                continue
            for o in outputs:
                if g.nodes[o].get("type") != "wallet":
                    continue
                if wallet_graph.has_edge(i, o):
                    wallet_graph[i][o]["weight"] += 1
                else:
                    wallet_graph.add_edge(i, o, weight=1)

    return wallet_graph


if __name__ == "__main__":
    from ingest import load_transactions

    txs = load_transactions("data/sample/mock_transactions.json")
    g = build_graph(txs)
    print(f"Full graph: {g.number_of_nodes()} nodes, {g.number_of_edges()} edges")

    wg = wallet_to_wallet_projection(g)
    print(f"Wallet projection: {wg.number_of_nodes()} nodes, {wg.number_of_edges()} edges")
