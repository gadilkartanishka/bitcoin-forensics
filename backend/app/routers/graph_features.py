from fastapi import APIRouter, UploadFile, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.graph_features_integration import ingest_graph_features

router = APIRouter(prefix="/graph-features", tags=["graph-features"])


@router.post("/upload")
async def upload_graph_features(file: UploadFile, db: Session = Depends(get_db)):
    content = (await file.read()).decode("utf-8")
    result = ingest_graph_features(content, db)
    return result