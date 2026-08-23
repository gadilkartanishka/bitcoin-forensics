from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
import datetime


class Wallet(Base):
    __tablename__ = "wallets"

    wallet_id = Column(String, primary_key=True)

    degree = Column(Integer, nullable=True)
    in_degree = Column(Integer, nullable=True)
    out_degree = Column(Integer, nullable=True)
    pagerank = Column(Float, nullable=True)
    centrality = Column(Float, nullable=True)

    anomaly_score = Column(Float, nullable=True)
    cluster_id = Column(Integer, nullable=True)
    risk_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)  # "LOW" | "MEDIUM" | "HIGH"
    
    inputs = relationship("TxInput", back_populates="wallet")
    outputs = relationship("TxOutput", back_populates="wallet")


class IPAddress(Base):
    __tablename__ = "ips"

    ip_address = Column(String, primary_key=True)
    country = Column(String, nullable=True)
    asn = Column(String, nullable=True)


class Transaction(Base):
    __tablename__ = "transactions"

    txid = Column(String, primary_key=True)
    timestamp = Column(DateTime, nullable=False)  # UTC, per Bhargavi (flagged assumption pending real dataset)

    src_ip = Column(String, ForeignKey("ips.ip_address"), nullable=True)
    dst_ip = Column(String, ForeignKey("ips.ip_address"), nullable=True)
    src_port = Column(Integer, nullable=True)
    dst_port = Column(Integer, nullable=True)

    src_geo_country = Column(String, nullable=True)
    src_asn = Column(String, nullable=True)
    dst_geo_country = Column(String, nullable=True)
    dst_asn = Column(String, nullable=True)

    total_input_amount = Column(Float, nullable=True)
    total_output_amount = Column(Float, nullable=True)

    flag_amount_mismatch = Column(Boolean, nullable=True)
    amount_mismatch_delta = Column(Float, nullable=True) 
    fee = Column(Float, nullable=True)                    
    script_type = Column(String, nullable=True)            

    src_ip_rel = relationship("IPAddress", foreign_keys=[src_ip])
    dst_ip_rel = relationship("IPAddress", foreign_keys=[dst_ip])

    inputs = relationship("TxInput", back_populates="transaction")
    outputs = relationship("TxOutput", back_populates="transaction")


class TxInput(Base):
    __tablename__ = "tx_inputs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    txid = Column(String, ForeignKey("transactions.txid"))
    wallet_id = Column(String, ForeignKey("wallets.wallet_id"))
    amount = Column(Float, nullable=False)

    transaction = relationship("Transaction", back_populates="inputs")
    wallet = relationship("Wallet", back_populates="inputs")


class TxOutput(Base):
    __tablename__ = "tx_outputs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    txid = Column(String, ForeignKey("transactions.txid"))
    wallet_id = Column(String, ForeignKey("wallets.wallet_id"))
    amount = Column(Float, nullable=False)

    transaction = relationship("Transaction", back_populates="outputs")
    wallet = relationship("Wallet", back_populates="outputs")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_id = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)

    ml_score = Column(Float, nullable=True)
    graph_score = Column(Float, nullable=True)
    behavioral_score = Column(Float, nullable=True)
    network_score = Column(Float, nullable=True)
    final_risk_score = Column(Float, nullable=False)

    reasons = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)