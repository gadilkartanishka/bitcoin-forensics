"""
Builds the entity/transaction graph.
Design decision: TX-as-node (bipartite) model to preserve
multi-input/multi-output transactions correctly.
"""


def build_graph(transactions: list[dict]):
    raise NotImplementedError


def wallet_to_wallet_projection(g):
    raise NotImplementedError
