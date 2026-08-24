from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.services.graph_builder import build_graph

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/{entity}")
def get_graph(entity: str, hops: int = Query(2, ge=1, le=5), db: Session = Depends(get_db)):
    wallet = db.query(models.Wallet).filter_by(wallet_id=entity).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Entity not found")

    graph = build_graph(entity, db, hops=hops)
    return graph