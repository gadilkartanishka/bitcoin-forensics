from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[schemas.AlertOut])
def get_alerts(
    risk_level: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(models.Alert)

    if risk_level:
        query = query.join(
            models.Wallet, models.Alert.entity_id == models.Wallet.wallet_id
        ).filter(models.Wallet.risk_level == str(risk_level).upper())

    alerts = query.order_by(models.Alert.final_risk_score.desc()).limit(limit).all()
    return alerts