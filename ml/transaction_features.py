"""
Computes wallet-level transaction-derived features from Bhargavi's clean
transaction dataset.

CRITICAL STRUCTURAL RULE (from the verified schema):
    input_addresses[i] does NOT correspond to output_addresses[i].
    They are independent lists. A transaction can have a different
    number of inputs than outputs.

What IS safe to assume, and used here:
    input_addresses[i] <-> input_amounts[i]   (same list, same index)
    output_addresses[i] <-> output_amounts[i] (same list, same index)
This is a direct, unambiguous pairing within a single list -- not the
forbidden cross-list input/output pairing.

FEATURE EXCLUDED -- avg_fee_paid / total_fee_paid:
    `fee` is a single value attached to the transaction as a whole, not
    to an individual wallet. A transaction can have multiple input
    wallets. Attributing the fee to one or more wallets (equal split?
    proportional to input amount? charged only to the largest input?)
    requires an allocation rule that is NOT specified anywhere in the
    verified schema or team handoff. Per instructions, this feature is
    excluded rather than invented. If the team decides on an explicit
    fee-allocation convention, this can be added later.

FEATURE EXCLUDED -- transaction_frequency / avg_time_between_transactions:
    In the current dataset every wallet appears in exactly one
    transaction, so no time delta between transactions can be computed
    for any wallet. This is a property of this specific batch, not a
    schema limitation -- the aggregation code below is written to
    generalize correctly to a real dataset where wallets recur, so
    these can be added once wallets with >1 transaction exist. Not
    implemented in v1 because they'd be undefined (NaN) for literally
    every row right now, which adds no signal and complicates
    preprocessing for zero benefit.

FEATURE EXCLUDED -- amount_variance:
    Variance over a single sample is undefined for the same reason.

Wallet-country/ASN association (a disclosed design choice, not an
invented amount allocation): a wallet appearing in input_addresses for
a transaction is associated with that transaction's src_geo_country /
src_asn (the wallet is funding the tx, broadcast from the src side);
a wallet appearing in output_addresses is associated with
dst_geo_country / dst_asn. This mirrors how src/dst IP metadata is
already structured in the schema and how Kshitij's graph code treats
src/dst IP nodes -- it is not an amount-allocation rule and carries no
risk of double-counting or invented numeric splits.
"""

from __future__ import annotations

from collections import defaultdict

import pandas as pd


def compute_wallet_transaction_features(transactions: list[dict]) -> pd.DataFrame:
    sent_amounts: dict[str, list[float]] = defaultdict(list)
    received_amounts: dict[str, list[float]] = defaultdict(list)
    countries: dict[str, set] = defaultdict(set)
    asns: dict[str, set] = defaultdict(set)
    all_wallets: set[str] = set()

    for tx in transactions:
        src_country = tx.get("src_geo_country")
        src_asn = tx.get("src_asn")
        dst_country = tx.get("dst_geo_country")
        dst_asn = tx.get("dst_asn")

        # input_addresses[i] <-> input_amounts[i]: direct, same-list pairing.
        for addr, amount in zip(tx["input_addresses"], tx["input_amounts"]):
            all_wallets.add(addr)
            if amount is not None:
                sent_amounts[addr].append(float(amount))
            if src_country is not None:
                countries[addr].add(src_country)
            if src_asn is not None:
                asns[addr].add(src_asn)

        # output_addresses[i] <-> output_amounts[i]: direct, same-list pairing.
        for addr, amount in zip(tx["output_addresses"], tx["output_amounts"]):
            all_wallets.add(addr)
            if amount is not None:
                received_amounts[addr].append(float(amount))
            if dst_country is not None:
                countries[addr].add(dst_country)
            if dst_asn is not None:
                asns[addr].add(dst_asn)

    rows = []
    for wallet in sorted(all_wallets):
        sent = sent_amounts.get(wallet, [])
        received = received_amounts.get(wallet, [])
        total_sent = sum(sent)
        total_received = sum(received)
        rows.append({
            "wallet_id": wallet,
            "total_sent": total_sent,
            "total_received": total_received,
            "avg_sent_amount": (total_sent / len(sent)) if sent else 0.0,
            "avg_received_amount": (total_received / len(received)) if received else 0.0,
            "net_flow": total_received - total_sent,
            "unique_countries_touched": len(countries.get(wallet, set())),
            "unique_asns_touched": len(asns.get(wallet, set())),
        })

    return pd.DataFrame(rows)