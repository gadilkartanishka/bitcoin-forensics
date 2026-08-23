import csv
from io import StringIO
from sqlalchemy.orm import Session
from app import models


def ingest_graph_features(content: str, db: Session):
    """
    Ingest Kshitij's wallet_features_real.csv — graph-level features
    including degree, pagerank, community_id, community_size.
    """
    reader = csv.DictReader(StringIO(content))
    records = list(reader)

    wallet_ids = [r["wallet_id"] for r in records]
    existing = {
        w.wallet_id: w for w in db.query(models.Wallet)
        .filter(models.Wallet.wallet_id.in_(wallet_ids)).all()
    }

    to_insert = []
    to_update = []

    for r in records:
        wid = r["wallet_id"]
        data = {
            "wallet_id": wid,
            "degree": int(r["graph_degree"]) if r.get("graph_degree") else None,
            "in_degree": int(r["graph_in_degree"]) if r.get("graph_in_degree") else None,
            "out_degree": int(r["graph_out_degree"]) if r.get("graph_out_degree") else None,
            "pagerank": float(r["pagerank"]) if r.get("pagerank") else None,
            "centrality": float(r["betweenness_centrality"]) if r.get("betweenness_centrality") else None,
            "community_id": int(r["community_id"]) if r.get("community_id") else None,
            "community_size": int(r["community_size"]) if r.get("community_size") else None,
        }
        if wid in existing:
            to_update.append(data)
        else:
            to_insert.append(data)

    if to_insert:
        db.bulk_insert_mappings(models.Wallet, to_insert)
    if to_update:
        db.bulk_update_mappings(models.Wallet, to_update)

    db.commit()

    return {
        "total_records": len(records),
        "inserted": len(to_insert),
        "updated": len(to_update),
    }