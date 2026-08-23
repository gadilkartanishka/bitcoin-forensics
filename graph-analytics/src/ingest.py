"""
Loads clean transaction records into a list of dicts.

This is the ONLY module that should need to change once Bhargavi's real
pipeline is wired in. Everything downstream (graph_builder, features,
etc.) consumes the list-of-dicts shape this returns, regardless of
source.

LOCKED schema, confirmed by Bhargavi (PR #1, feature/data-ingestion,
2026-08-22):
{
    "timestamp": "2024-01-01 00:00:00 UTC",   # UTC normalization assumed,
                                               # not yet confirmed against
                                               # real organizer data
    "src_ip": "164.57.12.140",
    "dst_ip": "63.114.71.52",
    "src_port": 45372,
    "dst_port": 18333,
    "txid": "tx00000",
    "input_addresses": [...],
    "output_addresses": [...],   # can be a DIFFERENT LENGTH than inputs
    "input_amounts": [...],
    "output_amounts": [...],
    "fee": 0.00012345,           # currently null until real dataset confirms
    "script_type": "P2PKH",      # currently null until real dataset confirms
    "src_geo_country": "India",
    "src_asn": "AS4837",
    "dst_geo_country": "Germany",
    "dst_asn": "AS9009",
    "flag_amount_mismatch": false,
    "amount_mismatch_delta": -0.00003,   # signed: total_input - total_output
}

Notes:
- input_addresses/output_addresses can have DIFFERENT LENGTHS from
  each other (multi-in/multi-out) — expected, not an error. See
  graph_builder.py (TX-as-node model).
- fee/script_type may be null for now — handled with .get() downstream,
  never required.
- flag_amount_mismatch + amount_mismatch_delta are pass-through signals,
  never a reason to drop a row.
- timestamp UTC-ness is an assumption per Bhargavi's README note — worth
  revisiting before trusting cross-layer timing correlation.
"""

import json


def load_transactions(path: str) -> list[dict]:
    with open(path) as f:
        transactions = json.load(f)

    for tx in transactions:
        _validate(tx)

    return transactions


def _validate(tx: dict) -> None:
    required = [
        "txid", "timestamp", "src_ip", "dst_ip",
        "input_addresses", "output_addresses",
        "input_amounts", "output_amounts",
    ]
    missing = [f for f in required if f not in tx]
    if missing:
        raise ValueError(f"Transaction {tx.get('txid', '?')} missing fields: {missing}")
    if len(tx["input_addresses"]) != len(tx["input_amounts"]):
        raise ValueError(f"TX {tx['txid']}: input_addresses/input_amounts length mismatch")
    if len(tx["output_addresses"]) != len(tx["output_amounts"]):
        raise ValueError(f"TX {tx['txid']}: output_addresses/output_amounts length mismatch")
    tx.setdefault("flag_amount_mismatch", False)
    tx.setdefault("amount_mismatch_delta", 0.0)
    tx.setdefault("fee", None)
    tx.setdefault("script_type", None)


if __name__ == "__main__":
    txs = load_transactions("data/sample/mock_transactions.json")
    print(f"Loaded {len(txs)} transactions")
    print(txs[0])
