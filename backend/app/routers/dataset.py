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
    """Insert one transaction record (Bhargavi's schema) into the DB."""

    txid = record["txid"]

    # skip if already exists (avoid duplicate key errors on re-upload)
    existing = db.query(models.Transaction).filter_by(txid=txid).first()
    if existing:
        return

    # --- IP nodes ---
    src_ip = record.get("src_ip")
    dst_ip = record.get("dst_ip")

    if src_ip and not db.query(models.IPAddress).filter_by(ip_address=src_ip).first():
        db.add(models.IPAddress(ip_address=src_ip))
    if dst_ip and not db.query(models.IPAddress).filter_by(ip_address=dst_ip).first():
        db.add(models.IPAddress(ip_address=dst_ip))
    db.flush()  # ensure IPs exist before FK reference

    # --- Transaction ---
    input_amounts = record.get("input_amounts", [])
    output_amounts = record.get("output_amounts", [])

    tx = models.Transaction(
        txid=txid,
        timestamp=datetime.strptime(record["timestamp"].replace(" UTC", ""), "%Y-%m-%d %H:%M:%S"),
        src_ip=src_ip,
        dst_ip=dst_ip,
        src_port=record.get("src_port"),
        dst_port=record.get("dst_port"),
        src_geo_country=record.get("src_geo_country"),
        src_asn=record.get("src_asn"),
        dst_geo_country=record.get("dst_geo_country"),
        dst_asn=record.get("dst_asn"),
        total_input_amount=sum(input_amounts) if input_amounts else None,
        total_output_amount=sum(output_amounts) if output_amounts else None,
        flag_amount_mismatch=record.get("flag_amount_mismatch"),
        amount_mismatch_delta=record.get("amount_mismatch_delta"),
        fee=record.get("fee"),
        script_type=record.get("script_type"),
    )
    db.add(tx)

    # --- Wallets + TxInput/TxOutput junctions ---
    input_addresses = record.get("input_addresses", [])
    output_addresses = record.get("output_addresses", [])

    for addr, amt in zip(input_addresses, input_amounts):
        if not db.query(models.Wallet).filter_by(wallet_id=addr).first():
            db.add(models.Wallet(wallet_id=addr))
        db.flush()
        db.add(models.TxInput(txid=txid, wallet_id=addr, amount=amt))

    for addr, amt in zip(output_addresses, output_amounts):
        if not db.query(models.Wallet).filter_by(wallet_id=addr).first():
            db.add(models.Wallet(wallet_id=addr))
        db.flush()
        db.add(models.TxOutput(txid=txid, wallet_id=addr, amount=amt))


def parse_csv(content: str):
    reader = csv.DictReader(StringIO(content))
    records = []
    for row in reader:
        # CSV stores lists as strings — need to parse them back
        for field in ["input_addresses", "output_addresses", "input_amounts", "output_amounts"]:
            if field in row and row[field]:
                row[field] = json.loads(row[field].replace("'", '"'))
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

    return {
        "status": "completed",
        "total_records": len(records),
        "inserted": inserted,
        "errors": errors,
    }