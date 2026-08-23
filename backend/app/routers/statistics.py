from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("")
def get_statistics(db: Session = Depends(get_db)):
    total_wallets = db.query(func.count(models.Wallet.wallet_id)).scalar()
    total_transactions = db.query(func.count(models.Transaction.txid)).scalar()
    total_ips = db.query(func.count(models.IPAddress.ip_address)).scalar()
    total_alerts = db.query(func.count(models.Alert.id)).scalar()

    high_risk_wallets = db.query(func.count(models.Wallet.wallet_id)).filter(
        models.Wallet.risk_level == "HIGH"
    ).scalar()
    medium_risk_wallets = db.query(func.count(models.Wallet.wallet_id)).filter(
        models.Wallet.risk_level == "MEDIUM"
    ).scalar()
    low_risk_wallets = db.query(func.count(models.Wallet.wallet_id)).filter(
        models.Wallet.risk_level == "LOW"
    ).scalar()

    flagged_mismatch_txs = db.query(func.count(models.Transaction.txid)).filter(
        models.Transaction.flag_amount_mismatch == True
    ).scalar()

    return {
        "total_wallets": total_wallets,
        "total_transactions": total_transactions,
        "total_ips": total_ips,
        "total_alerts": total_alerts,
        "risk_breakdown": {
            "HIGH": high_risk_wallets,
            "MEDIUM": medium_risk_wallets,
            "LOW": low_risk_wallets,
            "unscored": total_wallets - (high_risk_wallets + medium_risk_wallets + low_risk_wallets),
        },
        "flagged_mismatch_transactions": flagged_mismatch_txs,
    }