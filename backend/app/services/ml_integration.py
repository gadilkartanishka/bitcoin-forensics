import json
import csv
from io import StringIO
from sqlalchemy.orm import Session
from app import models


def ingest_ml_results(content: str, filetype: str, db: Session):
    """
    Ingest Osin's ML pipeline output using true bulk operations —
    bulk_insert_mappings/bulk_update_mappings skip per-object ORM
    overhead, much faster for large files (hundreds+ of rows).
    """
    if filetype == "json":
        records = json.loads(content)
    elif filetype == "csv":
        reader = csv.DictReader(StringIO(content))
        records = list(reader)
        for r in records:
            if "reasons" in r and r["reasons"]:
                try:
                    r["reasons"] = json.loads(r["reasons"])
                except (json.JSONDecodeError, TypeError):
                    r["reasons"] = []
            if "anomaly_score" in r and r["anomaly_score"] not in (None, ""):
                r["anomaly_score"] = float(r["anomaly_score"])
            if "risk_score" in r and r["risk_score"] not in (None, ""):
                r["risk_score"] = float(r["risk_score"])
    else:
        raise ValueError("filetype must be 'json' or 'csv'")

    wallet_ids = [r["wallet_id"] for r in records]

    existing_wallet_ids = {
        row[0] for row in db.query(models.Wallet.wallet_id)
        .filter(models.Wallet.wallet_id.in_(wallet_ids)).all()
    }
    existing_alert_map = {
        row[0]: row[1] for row in db.query(models.Alert.entity_id, models.Alert.id)
        .filter(models.Alert.entity_id.in_(wallet_ids), models.Alert.entity_type == "wallet").all()
    }

    wallets_to_insert = []
    wallets_to_update = []
    alerts_to_insert = []
    alerts_to_update = []
    errors = []
    alerts_touched = 0

    for record in records:
        try:
            wallet_id = record["wallet_id"]
            anomaly_score = record.get("anomaly_score")
            risk_score = record.get("risk_score")
            risk_level = record.get("risk_level")
            reasons = record.get("reasons", [])
            reasons_str = json.dumps(reasons) if isinstance(reasons, list) else str(reasons)

            wallet_data = {
                "wallet_id": wallet_id,
                "anomaly_score": anomaly_score,
                "risk_score": risk_score,
                "risk_level": risk_level,
            }
            if wallet_id in existing_wallet_ids:
                wallets_to_update.append(wallet_data)
            else:
                wallets_to_insert.append(wallet_data)

            if risk_level in ("MEDIUM", "HIGH"):
                alert_data = {
                    "entity_id": wallet_id,
                    "entity_type": "wallet",
                    "ml_score": anomaly_score,
                    "final_risk_score": risk_score,
                    "reasons": reasons_str,
                }
                if wallet_id in existing_alert_map:
                    alert_data["id"] = existing_alert_map[wallet_id]
                    alerts_to_update.append(alert_data)
                else:
                    alerts_to_insert.append(alert_data)
                alerts_touched += 1

        except Exception as e:
            errors.append({"wallet_id": record.get("wallet_id", "unknown"), "error": str(e)})

    if wallets_to_insert:
        db.bulk_insert_mappings(models.Wallet, wallets_to_insert)
    if wallets_to_update:
        db.bulk_update_mappings(models.Wallet, wallets_to_update)
    if alerts_to_insert:
        db.bulk_insert_mappings(models.Alert, alerts_to_insert)
    if alerts_to_update:
        db.bulk_update_mappings(models.Alert, alerts_to_update)

    db.commit()

    return {
        "total_records": len(records),
        "wallets_updated": len(wallets_to_insert) + len(wallets_to_update),
        "alerts_created_or_updated": alerts_touched,
        "errors": errors,
    }