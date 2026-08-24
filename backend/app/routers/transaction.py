from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/transaction", tags=["transaction"])

@router.get("", response_model=list[schemas.TransactionOut])
def list_transactions(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    flagged_only: bool = Query(False, description="Filter only transactions with amount mismatch"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Transaction)
    if flagged_only:
        query = query.filter(models.Transaction.flag_amount_mismatch == True)
    
    return query.order_by(desc(models.Transaction.timestamp)).offset(offset).limit(limit).all()

@router.get("/{txid}", response_model=schemas.TransactionOut)
def get_transaction(txid: str, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter_by(txid=txid).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx