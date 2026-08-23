import pandas as pd

REQUIRED_FIELDS = ["timestamp", "src_ip", "dst_ip", "txid",
                    "input_addresses", "output_addresses",
                    "input_amounts", "output_amounts"]

def validate(df):
    issues = []

    # 1. Required fields present
    for field in REQUIRED_FIELDS:
        if field not in df.columns:
            raise ValueError(f"Missing required column: {field}")

    # 2. Drop rows with no txid (can't be tracked at all)
    before = len(df)
    df = df[df["txid"].notna() & (df["txid"] != "")]
    issues.append(f"Dropped {before - len(df)} rows with missing txid")

    # 3. Drop rows where input/output addresses are both empty
    def has_addresses(row):
        return len(row["input_addresses"]) > 0 or len(row["output_addresses"]) > 0
    before = len(df)
    df = df[df.apply(has_addresses, axis=1)]
    issues.append(f"Dropped {before - len(df)} rows with no wallet addresses at all")

    # 4. Duplicate txid detection (keep first occurrence)
    before = len(df)
    df = df.drop_duplicates(subset="txid", keep="first")
    issues.append(f"Dropped {before - len(df)} duplicate transactions")

    # 5. Mismatched input/output amount-address counts (flag, don't drop)
    # Structural check: do the LIST LENGTHS match? (parsing sanity check, not a financial signal)
    def mismatch(row):
        return len(row["input_addresses"]) != len(row["input_amounts"]) or \
               len(row["output_addresses"]) != len(row["output_amounts"])
    df["flag_amount_mismatch"] = df.apply(mismatch, axis=1)

    # 6. Amount mismatch delta — VALUE check: total input BTC vs total output BTC.
    # Signed float, this is the actual ML feature Osin should use.
    def amount_delta(row):
        try:
            total_in = sum(row["input_amounts"])
            total_out = sum(row["output_amounts"])
            return round(total_in - total_out, 8)
        except (TypeError, ValueError):
            return None
    df["amount_mismatch_delta"] = df.apply(amount_delta, axis=1)

    for i in issues:
        print(i)

    return df.reset_index(drop=True)