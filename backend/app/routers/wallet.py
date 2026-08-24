from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/wallet", tags=["wallet"])

@router.get("/{wallet_id}", response_model=schemas.WalletOut)
def get_wallet(wallet_id: str, db: Session = Depends(get_db)):
    wallet = db.query(models.Wallet).filter_by(wallet_id=wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet