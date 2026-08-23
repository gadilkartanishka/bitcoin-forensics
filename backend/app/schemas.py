from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WalletOut(BaseModel):
    wallet_id: str
    degree: Optional[int] = None
    in_degree: Optional[int] = None
    out_degree: Optional[int] = None
    anomaly_score: Optional[float] = None
    risk_score: Optional[float] = None
    cluster_id: Optional[int] = None

    class Config:
        from_attributes = True

class TransactionOut(BaseModel):
    txid: str
    timestamp: datetime
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_geo_country: Optional[str] = None
    src_asn: Optional[str] = None
    dst_geo_country: Optional[str] = None
    dst_asn: Optional[str] = None
    total_input_amount: Optional[float] = None
    total_output_amount: Optional[float] = None
    flag_amount_mismatch: Optional[bool] = None
    amount_mismatch_delta: Optional[float] = None
    fee: Optional[float] = None
    script_type: Optional[str] = None

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: int
    entity_id: str
    entity_type: str
    final_risk_score: float
    reasons: Optional[str] = None

    class Config:
        from_attributes = True