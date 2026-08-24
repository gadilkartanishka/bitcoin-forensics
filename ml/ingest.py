"""
Loads the two verified handoff inputs:

  - Bhargavi's clean transaction dataset (JSON, list of transaction dicts)
  - Kshitij's wallet-level graph feature table (CSV, one row per wallet_id)

This module does not modify, recompute, or reinterpret either team
member's data. It only loads and does structural validation.

Verified input schema (transaction record), confirmed against the
actual uploaded clean_dataset__1_.json:

{
    "timestamp": str,
    "src_ip": str,
    "dst_ip": str,
    "src_port": int,
    "dst_port": int,
    "txid": str,
    "input_addresses": list[str],
    "output_addresses": list[str],   # NOT necessarily same length as inputs
    "input_amounts": list[float],
    "output_amounts": list[float],
    "fee": float | None,
    "script_type": str | None,
    "flag_amount_mismatch": bool,          # structural/data-quality flag only
    "amount_mismatch_delta": float,        # signed: total_input - total_output
    "src_geo_country": str | None,
    "src_asn": str | None,
    "dst_geo_country": str | None,
    "dst_asn": str | None,
}

Verified wallet feature CSV columns (Kshitij's handoff, 15 columns):
    wallet_id, tx_as_sender, tx_as_receiver, total_tx_count,
    mismatch_tx_count, max_abs_amount_mismatch_delta, cross_border_tx_count,
    graph_degree, graph_in_degree, graph_out_degree, pagerank,
    betweenness_centrality, unique_counterparties, community_id,
    community_size
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

REQUIRED_TX_FIELDS = [
    "timestamp", "src_ip", "dst_ip", "txid",
    "input_addresses", "output_addresses",
    "input_amounts", "output_amounts",
]

REQUIRED_WALLET_CSV_COLUMNS = [
    "wallet_id", "tx_as_sender", "tx_as_receiver", "total_tx_count",
    "mismatch_tx_count", "max_abs_amount_mismatch_delta",
    "cross_border_tx_count", "graph_degree", "graph_in_degree",
    "graph_out_degree", "pagerank", "betweenness_centrality",
    "unique_counterparties",
]


def load_transactions(path: str | Path) -> list[dict]:
    """Load Bhargavi's clean transaction dataset. Raises on structural
    problems rather than silently coercing bad data."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Transaction dataset not found: {path}")

    with open(path) as f:
        transactions = json.load(f)

    if not isinstance(transactions, list):
        raise ValueError(
            f"Expected a JSON list of transaction records, got {type(transactions).__name__}"
        )

    for tx in transactions:
        missing = [field for field in REQUIRED_TX_FIELDS if field not in tx]
        if missing:
            raise ValueError(f"Transaction {tx.get('txid', '?')} missing fields: {missing}")
        if len(tx["input_addresses"]) != len(tx["input_amounts"]):
            raise ValueError(
                f"TX {tx['txid']}: input_addresses/input_amounts length mismatch "
                f"({len(tx['input_addresses'])} vs {len(tx['input_amounts'])})"
            )
        if len(tx["output_addresses"]) != len(tx["output_amounts"]):
            raise ValueError(
                f"TX {tx['txid']}: output_addresses/output_amounts length mismatch "
                f"({len(tx['output_addresses'])} vs {len(tx['output_amounts'])})"
            )
        # Defaults for fields that may legitimately be null in the real dataset.
        tx.setdefault("fee", None)
        tx.setdefault("script_type", None)
        tx.setdefault("flag_amount_mismatch", False)
        tx.setdefault("amount_mismatch_delta", 0.0)
        tx.setdefault("src_geo_country", None)
        tx.setdefault("src_asn", None)
        tx.setdefault("dst_geo_country", None)
        tx.setdefault("dst_asn", None)

    return transactions


def load_wallet_graph_features(path: str | Path) -> pd.DataFrame:
    """Load Kshitij's wallet-level graph feature table exactly as handed
    off -- raw, unscaled, unmodified. Only structural validation here."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Wallet graph feature file not found: {path}")

    df = pd.read_csv(path)

    missing_cols = [c for c in REQUIRED_WALLET_CSV_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"wallet_features_real.csv missing expected columns: {missing_cols}")

    dup_count = df["wallet_id"].duplicated().sum()
    if dup_count > 0:
        raise ValueError(
            f"wallet_features_real.csv has {dup_count} duplicate wallet_id values; "
            "this must be resolved by Kshitij's pipeline before use."
        )

    return df