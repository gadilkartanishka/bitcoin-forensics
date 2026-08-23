from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/transaction", tags=["transaction"])

@router.get("/{txid}", response_model=schemas.TransactionOut)
def get_transaction(txid: str, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter_by(txid=txid).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx