import json
import csv
from io import StringIO
from sqlalchemy.orm import Session
from app import models


def ingest_ml_results(content: str, filetype: str, db: Session):
    """
    Ingest Osin's ML pipeline output (wallet_id, anomaly_score, risk_score,
    risk_level, reasons) into the wallets and alerts tables.

    filetype: "json" or "csv"
    """
    if filetype == "json":
        records = json.loads(content)
    elif filetype == "csv":
        reader = csv.DictReader(StringIO(content))
        records = list(reader)
        # reasons comes as a JSON-encoded string in CSV, parse it back
        for r in records:
            if "reasons" in r and r["reasons"]:
                try:
                    r["reasons"] = json.loads(r["reasons"])
                except (json.JSONDecodeError, TypeError):
                    r["reasons"] = []
            # CSV values are strings — cast numeric fields
            if "anomaly_score" in r and r["anomaly_score"] not in (None, ""):
                r["anomaly_score"] = float(r["anomaly_score"])
            if "risk_score" in r and r["risk_score"] not in (None, ""):
                r["risk_score"] = float(r["risk_score"])
    else:
        raise ValueError("filetype must be 'json' or 'csv'")

    updated = 0
    alerts_created = 0
    errors = []

    for record in records:
        try:
            wallet_id = record["wallet_id"]
            anomaly_score = record.get("anomaly_score")
            risk_score = record.get("risk_score")
            risk_level = record.get("risk_level")
            reasons = record.get("reasons", [])

            # --- update wallet row (create if it doesn't exist yet) ---
            wallet = db.query(models.Wallet).filter_by(wallet_id=wallet_id).first()
            if not wallet:
                wallet = models.Wallet(wallet_id=wallet_id)
                db.add(wallet)

            wallet.anomaly_score = anomaly_score
            wallet.risk_score = risk_score
            wallet.risk_level = risk_level
            db.flush()
            updated += 1

            # --- create an alert row for MEDIUM/HIGH risk wallets ---
            if risk_level in ("MEDIUM", "HIGH"):
                existing_alert = db.query(models.Alert).filter_by(
                    entity_id=wallet_id, entity_type="wallet"
                ).first()

                reasons_str = json.dumps(reasons) if isinstance(reasons, list) else str(reasons)

                if existing_alert:
                    existing_alert.ml_score = anomaly_score
                    existing_alert.final_risk_score = risk_score
                    existing_alert.reasons = reasons_str
                else:
                    db.add(models.Alert(
                        entity_id=wallet_id,
                        entity_type="wallet",
                        ml_score=anomaly_score,
                        final_risk_score=risk_score,
                        reasons=reasons_str,
                    ))
                alerts_created += 1

        except Exception as e:
            errors.append({"wallet_id": record.get("wallet_id", "unknown"), "error": str(e)})

    db.commit()

    return {
        "total_records": len(records),
        "wallets_updated": updated,
        "alerts_created_or_updated": alerts_created,
        "errors": errors,
    }