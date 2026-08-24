from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/wallet", tags=["wallet"])

@router.get("", response_model=list[schemas.WalletOut])
def list_wallets(
    risk_level: Optional[str] = Query(None, description="Filter by risk level: LOW, MEDIUM, HIGH"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort_by_risk: bool = Query(True, description="Sort by risk_score descending"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Wallet)
    if risk_level:
        query = query.filter(models.Wallet.risk_level == risk_level.upper())
    
    if sort_by_risk:
        query = query.order_by(desc(models.Wallet.risk_score).nullslast())
    
    return query.offset(offset).limit(limit).all()

@router.get("/{wallet_id}")
def get_wallet(wallet_id: str, db: Session = Depends(get_db)):
    wallet = db.query(models.Wallet).filter_by(wallet_id=wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    # Fetch alerts for this entity
    alerts = db.query(models.Alert).filter_by(entity_id=wallet_id).all()
    alert_reasons = []
    for a in alerts:
        if a.reasons:
            alert_reasons.append(a.reasons)

    # Fetch inputs (funds sent by this wallet)
    inputs = db.query(models.TxInput).filter_by(wallet_id=wallet_id).all()
    outflows = []
    total_sent = 0.0
    for inp in inputs:
        amt = inp.amount or 0.0
        total_sent += amt
        tx = inp.transaction
        outflows.append({
            "txid": inp.txid,
            "amount": amt,
            "timestamp": tx.timestamp.isoformat() if tx and tx.timestamp else None,
            "flag_amount_mismatch": tx.flag_amount_mismatch if tx else False,
            "dst_country": tx.dst_geo_country if tx else None,
        })

    # Fetch outputs (funds received by this wallet)
    outputs = db.query(models.TxOutput).filter_by(wallet_id=wallet_id).all()
    inflows = []
    total_received = 0.0
    for out in outputs:
        amt = out.amount or 0.0
        total_received += amt
        tx = out.transaction
        inflows.append({
            "txid": out.txid,
            "amount": amt,
            "timestamp": tx.timestamp.isoformat() if tx and tx.timestamp else None,
            "flag_amount_mismatch": tx.flag_amount_mismatch if tx else False,
            "src_country": tx.src_geo_country if tx else None,
        })

    return {
        "wallet_id": wallet.wallet_id,
        "id": wallet.wallet_id,
        "degree": wallet.degree,
        "in_degree": wallet.in_degree,
        "out_degree": wallet.out_degree,
        "pagerank": wallet.pagerank,
        "centrality": wallet.centrality,
        "anomaly_score": wallet.anomaly_score,
        "risk_score": wallet.risk_score,
        "risk_level": wallet.risk_level,
        "community_id": wallet.community_id,
        "community_size": wallet.community_size,
        "total_sent_btc": round(total_sent, 8),
        "total_received_btc": round(total_received, 8),
        "alerts": alert_reasons,
        "inflows": inflows,
        "outflows": outflows,
    }