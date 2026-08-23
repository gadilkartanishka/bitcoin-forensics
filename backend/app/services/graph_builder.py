from sqlalchemy.orm import Session
from sqlalchemy import or_
from app import models


def build_graph(entity_id: str, db: Session, hops: int = 2):
    """
    Build a {nodes, edges} graph centered on `entity_id` (a wallet_id),
    expanding outward up to `hops` steps via shared transactions.
    Derived live from tx_inputs/tx_outputs — no precomputed edge table.
    """
    visited_wallets = set()
    visited_txs = set()
    frontier = {entity_id}

    nodes = {}
    edges = []

    for _ in range(hops):
        if not frontier:
            break
        next_frontier = set()

        # find all transactions touching wallets in the current frontier
        tx_ids_in = db.query(models.TxInput.txid).filter(
            models.TxInput.wallet_id.in_(frontier)
        ).distinct()
        tx_ids_out = db.query(models.TxOutput.txid).filter(
            models.TxOutput.wallet_id.in_(frontier)
        ).distinct()
        tx_ids = {row[0] for row in tx_ids_in.all()} | {row[0] for row in tx_ids_out.all()}
        tx_ids -= visited_txs

        for txid in tx_ids:
            visited_txs.add(txid)

            tx_node_id = f"tx:{txid}"
            if tx_node_id not in nodes:
                nodes[tx_node_id] = {"id": tx_node_id, "type": "transaction", "txid": txid}

            inputs = db.query(models.TxInput).filter_by(txid=txid).all()
            outputs = db.query(models.TxOutput).filter_by(txid=txid).all()

            for inp in inputs:
                wid = inp.wallet_id
                wallet_node_id = f"wallet:{wid}"
                if wallet_node_id not in nodes:
                    wallet = db.query(models.Wallet).filter_by(wallet_id=wid).first()
                    nodes[wallet_node_id] = {
                        "id": wallet_node_id,
                        "type": "wallet",
                        "wallet_id": wid,
                        "risk_score": wallet.risk_score if wallet else None,
                        "anomaly_score": wallet.anomaly_score if wallet else None,
                    }
                edges.append({
                    "source": wallet_node_id,
                    "target": tx_node_id,
                    "type": "input",
                    "amount": inp.amount,
                })
                if wid not in visited_wallets:
                    next_frontier.add(wid)

            for out in outputs:
                wid = out.wallet_id
                wallet_node_id = f"wallet:{wid}"
                if wallet_node_id not in nodes:
                    wallet = db.query(models.Wallet).filter_by(wallet_id=wid).first()
                    nodes[wallet_node_id] = {
                        "id": wallet_node_id,
                        "type": "wallet",
                        "wallet_id": wid,
                        "risk_score": wallet.risk_score if wallet else None,
                        "anomaly_score": wallet.anomaly_score if wallet else None,
                    }
                edges.append({
                    "source": tx_node_id,
                    "target": wallet_node_id,
                    "type": "output",
                    "amount": out.amount,
                })
                if wid not in visited_wallets:
                    next_frontier.add(wid)

        visited_wallets |= frontier
        frontier = next_frontier - visited_wallets

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
    }