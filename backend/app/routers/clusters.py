from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/clusters", tags=["clusters"])


@router.get("")
def get_clusters(db: Session = Depends(get_db)):
    wallets = db.query(models.Wallet).filter(models.Wallet.community_id.isnot(None)).all()

    clusters = {}
    for w in wallets:
        cid = w.community_id
        if cid not in clusters:
            clusters[cid] = {
                "community_id": cid,
                "community_size": w.community_size,
                "wallets": [],
            }
        clusters[cid]["wallets"].append({
            "wallet_id": w.wallet_id,
            "risk_score": w.risk_score,
            "risk_level": w.risk_level,
        })

    return list(clusters.values())