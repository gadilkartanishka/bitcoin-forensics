from sqlalchemy.orm import Session
from app import models


def build_graph(entity_id: str, db: Session, hops: int = 2):
    """
    Build a {nodes, edges} graph centered on `entity_id` (a wallet_id),
    expanding outward up to `hops` steps via shared transactions.
    Includes wallet, transaction, and IP nodes with hop-distance from center.
    """
    nodes = {}
    edges = []
    distances = {f"wallet:{entity_id}": 0}
    visited_txs = set()
    frontier = {entity_id}
    current_hop = 0

    while frontier and current_hop < hops:
        current_hop += 1
        next_frontier = set()

        tx_ids_in = {row[0] for row in db.query(models.TxInput.txid).filter(
            models.TxInput.wallet_id.in_(frontier)).distinct().all()}
        tx_ids_out = {row[0] for row in db.query(models.TxOutput.txid).filter(
            models.TxOutput.wallet_id.in_(frontier)).distinct().all()}
        tx_ids = (tx_ids_in | tx_ids_out) - visited_txs

        for txid in tx_ids:
            visited_txs.add(txid)
            tx_node_id = f"tx:{txid}"
            tx_dist = current_hop
            if tx_node_id not in distances or distances[tx_node_id] > tx_dist:
                distances[tx_node_id] = tx_dist

            tx = db.query(models.Transaction).filter_by(txid=txid).first()
            if tx_node_id not in nodes:
                nodes[tx_node_id] = {"id": tx_node_id, "type": "transaction", "txid": txid}

            # --- IP nodes for this transaction ---
            for ip_val, ip_key in [(tx.src_ip, "src"), (tx.dst_ip, "dst")] if tx else []:
                if ip_val:
                    ip_node_id = f"ip:{ip_val}"
                    if ip_node_id not in nodes:
                        nodes[ip_node_id] = {"id": ip_node_id, "type": "ip", "ip_address": ip_val}
                    ip_dist = current_hop
                    if ip_node_id not in distances or distances[ip_node_id] > ip_dist:
                        distances[ip_node_id] = ip_dist
                    edges.append({
                        "source": ip_node_id if ip_key == "src" else tx_node_id,
                        "target": tx_node_id if ip_key == "src" else ip_node_id,
                        "type": "observed",
                    })

            inputs = db.query(models.TxInput).filter_by(txid=txid).all()
            outputs = db.query(models.TxOutput).filter_by(txid=txid).all()

            for inp in inputs:
                wid = inp.wallet_id
                wallet_node_id = f"wallet:{wid}"
                if wallet_node_id not in nodes:
                    wallet = db.query(models.Wallet).filter_by(wallet_id=wid).first()
                    nodes[wallet_node_id] = {
                        "id": wallet_node_id, "type": "wallet", "wallet_id": wid,
                        "risk_score": wallet.risk_score if wallet else None,
                        "anomaly_score": wallet.anomaly_score if wallet else None,
                    }
                w_dist = current_hop
                if wallet_node_id not in distances or distances[wallet_node_id] > w_dist:
                    distances[wallet_node_id] = w_dist
                edges.append({"source": wallet_node_id, "target": tx_node_id, "type": "input", "amount": inp.amount})
                if wid not in distances or distances.get(f"wallet:{wid}", 999) >= current_hop:
                    next_frontier.add(wid)

            for out in outputs:
                wid = out.wallet_id
                wallet_node_id = f"wallet:{wid}"
                if wallet_node_id not in nodes:
                    wallet = db.query(models.Wallet).filter_by(wallet_id=wid).first()
                    nodes[wallet_node_id] = {
                        "id": wallet_node_id, "type": "wallet", "wallet_id": wid,
                        "risk_score": wallet.risk_score if wallet else None,
                        "anomaly_score": wallet.anomaly_score if wallet else None,
                    }
                w_dist = current_hop
                if wallet_node_id not in distances or distances[wallet_node_id] > w_dist:
                    distances[wallet_node_id] = w_dist
                edges.append({"source": tx_node_id, "target": wallet_node_id, "type": "output", "amount": out.amount})
                if wid not in distances or distances.get(f"wallet:{wid}", 999) >= current_hop:
                    next_frontier.add(wid)

        frontier = next_frontier

    for node_id, node in nodes.items():
        node["distance"] = distances.get(node_id, None)
    distances[f"wallet:{entity_id}"] = 0

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
    }