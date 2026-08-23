from fastapi import APIRouter, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.ml_integration import ingest_ml_results

router = APIRouter(prefix="/ml", tags=["ml"])


@router.post("/upload-results")
async def upload_ml_results(file: UploadFile, db: Session = Depends(get_db)):
    content = (await file.read()).decode("utf-8")
    filename = file.filename.lower()

    if filename.endswith(".json"):
        filetype = "json"
    elif filename.endswith(".csv"):
        filetype = "csv"
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or JSON.")

    result = ingest_ml_results(content, filetype, db)
    return result