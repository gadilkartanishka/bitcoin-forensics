import csv
import json
import xml.etree.ElementTree as ET
from io import StringIO
from datetime import datetime
from fastapi import APIRouter, UploadFile, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

router = APIRouter(prefix="/dataset", tags=["dataset"])


def parse_record(record: dict, db: Session):
    """Insert one transaction record into the DB with safe type coercion."""

    txid = str(record["txid"]).strip()

    # Skip if already exists
    existing = db.query(models.Transaction).filter_by(txid=txid).first()
    if existing:
        return

    # --- IP nodes ---
    src_ip = record.get("src_ip")
    dst_ip = record.get("dst_ip")

    if src_ip and not db.query(models.IPAddress).filter_by(ip_address=src_ip).first():
        db.add(models.IPAddress(ip_address=src_ip, country=record.get("src_geo_country"), asn=record.get("src_asn")))
    if dst_ip and not db.query(models.IPAddress).filter_by(ip_address=dst_ip).first():
        db.add(models.IPAddress(ip_address=dst_ip, country=record.get("dst_geo_country"), asn=record.get("dst_asn")))
    db.flush()

    # --- Amounts and Types ---
    raw_in_amts = record.get("input_amounts", [])
    raw_out_amts = record.get("output_amounts", [])
    input_amounts = [float(x) for x in raw_in_amts if x is not None and str(x).strip() != ""]
    output_amounts = [float(x) for x in raw_out_amts if x is not None and str(x).strip() != ""]

    raw_ts = str(record.get("timestamp", "")).replace(" UTC", "").strip()
    try:
        ts = datetime.strptime(raw_ts, "%Y-%m-%d %H:%M:%S")
    except Exception:
        try:
            ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
        except Exception:
            ts = datetime.utcnow()

    src_port = int(record["src_port"]) if record.get("src_port") not in (None, "", "null") else None
    dst_port = int(record["dst_port"]) if record.get("dst_port") not in (None, "", "null") else None
    fee = float(record["fee"]) if record.get("fee") not in (None, "", "null") else None
    delta = float(record["amount_mismatch_delta"]) if record.get("amount_mismatch_delta") not in (None, "", "null") else None
    mismatch_flag = str(record.get("flag_amount_mismatch", "")).lower() in ("true", "1", "yes")

    tx = models.Transaction(
        txid=txid,
        timestamp=ts,
        src_ip=src_ip,
        dst_ip=dst_ip,
        src_port=src_port,
        dst_port=dst_port,
        src_geo_country=record.get("src_geo_country"),
        src_asn=record.get("src_asn"),
        dst_geo_country=record.get("dst_geo_country"),
        dst_asn=record.get("dst_asn"),
        total_input_amount=sum(input_amounts) if input_amounts else 0.0,
        total_output_amount=sum(output_amounts) if output_amounts else 0.0,
        flag_amount_mismatch=mismatch_flag,
        amount_mismatch_delta=delta,
        fee=fee,
        script_type=record.get("script_type"),
    )
    db.add(tx)

    # --- Wallets + TxInput/TxOutput junctions ---
    input_addresses = record.get("input_addresses", [])
    output_addresses = record.get("output_addresses", [])

    for addr, amt in zip(input_addresses, input_amounts):
        addr_str = str(addr).strip()
        if not db.query(models.Wallet).filter_by(wallet_id=addr_str).first():
            db.add(models.Wallet(wallet_id=addr_str))
        db.flush()
        db.add(models.TxInput(txid=txid, wallet_id=addr_str, amount=amt))

    for addr, amt in zip(output_addresses, output_amounts):
        addr_str = str(addr).strip()
        if not db.query(models.Wallet).filter_by(wallet_id=addr_str).first():
            db.add(models.Wallet(wallet_id=addr_str))
        db.flush()
        db.add(models.TxOutput(txid=txid, wallet_id=addr_str, amount=amt))


def parse_csv(content: str):
    reader = csv.DictReader(StringIO(content))
    records = []
    for row in reader:
        # CSV stores lists as JSON, pipe-separated, or comma-separated strings
        for field in ["input_addresses", "output_addresses", "input_amounts", "output_amounts"]:
            if field in row and row[field] is not None:
                val = str(row[field]).strip()
                if val.startswith("[") and val.endswith("]"):
                    try:
                        row[field] = json.loads(val.replace("'", '"'))
                    except Exception:
                        row[field] = [x.strip(" '\"") for x in val[1:-1].split(",") if x.strip()]
                elif "|" in val:
                    # Pipe separated format (e.g. addr1|addr2 or 1.2|3.4)
                    if "amounts" in field:
                        row[field] = [float(x) for x in val.split("|") if x.strip()]
                    else:
                        row[field] = [x.strip() for x in val.split("|") if x.strip()]
                elif "," in val:
                    if "amounts" in field:
                        row[field] = [float(x) for x in val.split(",") if x.strip()]
                    else:
                        row[field] = [x.strip() for x in val.split(",") if x.strip()]
                else:
                    if "amounts" in field:
                        row[field] = [float(val)] if val else []
                    else:
                        row[field] = [val] if val else []
        records.append(row)
    return records



def parse_json(content: str):
    data = json.loads(content)
    return data if isinstance(data, list) else [data]


def parse_xml(content: str):
    root = ET.fromstring(content)
    records = []
    for tx_elem in root.findall(".//transaction"):
        record = {}
        for child in tx_elem:
            if child.tag in ["input_addresses", "output_addresses", "input_amounts", "output_amounts"]:
                record[child.tag] = [item.text for item in child]
            else:
                record[child.tag] = child.text
        records.append(record)
    return records


from app.services.pipeline_orchestrator import process_dataset_intelligence

@router.post("/upload")
async def upload_dataset(file: UploadFile, db: Session = Depends(get_db)):
    content = (await file.read()).decode("utf-8")
    filename = file.filename.lower()

    if filename.endswith(".csv"):
        records = parse_csv(content)
    elif filename.endswith(".json"):
        records = parse_json(content)
    elif filename.endswith(".xml"):
        records = parse_xml(content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV, JSON, or XML.")

    inserted = 0
    errors = []
    for record in records:
        try:
            parse_record(record, db)
            inserted += 1
        except Exception as e:
            errors.append({"txid": record.get("txid", "unknown"), "error": str(e)})

    db.commit()

    # Automatically trigger Real-Time Graph Analytics & ML Anomaly Scoring
    intel_results = process_dataset_intelligence(db)

    return {
        "status": "completed",
        "total_records": len(records),
        "inserted": inserted,
        "errors": errors,
        "intelligence": intel_results,
    }