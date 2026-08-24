from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.services.graph_builder import build_graph

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/full")
def get_full_graph(db: Session = Depends(get_db)):
    """Return the complete bipartite graph built from all ingested data."""
    wallets = db.query(models.Wallet).all()
    transactions = db.query(models.Transaction).all()

    nodes = []
    edges = []

    # Wallet nodes with risk scores
    for w in wallets:
        nodes.append({
            "id": f"wallet:{w.wallet_id}",
            "type": "wallet",
            "wallet_id": w.wallet_id,
            "risk_score": w.risk_score,
            "anomaly_score": w.anomaly_score,
            "risk_level": w.risk_level,
            "degree": w.degree,
            "in_degree": w.in_degree,
            "out_degree": w.out_degree,
            "community_id": w.community_id,
            "community_size": w.community_size,
        })

    seen_tx = set()
    for tx in transactions:
        tx_node_id = f"tx:{tx.txid}"
        if tx_node_id not in seen_tx:
            seen_tx.add(tx_node_id)
            nodes.append({
                "id": tx_node_id,
                "type": "transaction",
                "txid": tx.txid,
                "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
                "amount": tx.total_output_amount or tx.total_input_amount or 0.0,
                "amount_btc": tx.total_output_amount or tx.total_input_amount or 0.0,
                "fee": tx.fee,
            })

            # IP nodes
            for ip_val, rel in [(tx.src_ip, "broadcast_from"), (tx.dst_ip, "broadcast_to")]:
                if ip_val:
                    ip_id = f"ip:{ip_val}"
                    nodes.append({"id": ip_id, "type": "ip", "ip_address": ip_val})
                    edges.append({"source": tx_node_id, "target": ip_id, "type": rel})

        # Input edges
        for inp in tx.inputs:
            edges.append({
                "source": f"wallet:{inp.wallet_id}",
                "target": tx_node_id,
                "type": "funds",
                "amount": inp.amount,
            })

        # Output edges
        for out in tx.outputs:
            edges.append({
                "source": tx_node_id,
                "target": f"wallet:{out.wallet_id}",
                "type": "funds",
                "amount": out.amount,
            })

    # Deduplicate IP nodes
    seen_ids = set()
    unique_nodes = []
    for n in nodes:
        if n["id"] not in seen_ids:
            seen_ids.add(n["id"])
            unique_nodes.append(n)

    return {"nodes": unique_nodes, "edges": edges}


@router.get("/{entity}")
def get_graph(entity: str, hops: int = Query(2, ge=1, le=5), db: Session = Depends(get_db)):
    wallet = db.query(models.Wallet).filter_by(wallet_id=entity).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Entity not found")

    graph = build_graph(entity, db, hops=hops)
    return graph