from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[schemas.AlertOut])
def get_alerts(
    risk_level: Optional[str] = Query(None, description="Filter by risk level: LOW, MEDIUM, HIGH"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(models.Alert)

    if risk_level:
        query = query.join(
            models.Wallet, models.Alert.entity_id == models.Wallet.wallet_id
        ).filter(models.Wallet.risk_level == risk_level.upper())

    alerts = query.order_by(models.Alert.final_risk_score.desc()).limit(limit).all()
    return alerts