import pandas as pd
from dateutil import parser as dateparser

def normalize_timestamp(ts):
    try:
        return dateparser.parse(str(ts)).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return None

def normalize_address(addr):
    if not isinstance(addr, str):
        return addr
    return addr.strip()  # Bitcoin addresses are case-sensitive, so do NOT lowercase them

def normalize_ip(ip):
    if not isinstance(ip, str):
        return ip
    return ip.strip()

def normalize_amount(a):
    try:
        return round(float(a), 8)  # BTC has 8 decimal places of precision
    except (ValueError, TypeError):
        return None

def normalize(df):
    df["timestamp"] = df["timestamp"].apply(normalize_timestamp)
    df["src_ip"] = df["src_ip"].apply(normalize_ip)
    df["dst_ip"] = df["dst_ip"].apply(normalize_ip)

    df["input_addresses"] = df["input_addresses"].apply(lambda lst: [normalize_address(a) for a in lst])
    df["output_addresses"] = df["output_addresses"].apply(lambda lst: [normalize_address(a) for a in lst])

    df["input_amounts"] = df["input_amounts"].apply(lambda lst: [normalize_amount(a) for a in lst])
    df["output_amounts"] = df["output_amounts"].apply(lambda lst: [normalize_amount(a) for a in lst])

    df["src_port"] = pd.to_numeric(df["src_port"], errors="coerce").astype("Int64")
    df["dst_port"] = pd.to_numeric(df["dst_port"], errors="coerce").astype("Int64")

    # Drop rows where timestamp failed to parse — unusable for a forensic timeline
    before = len(df)
    df = df[df["timestamp"].notna()]
    print(f"Dropped {before - len(df)} rows with unparseable timestamps")

    return df.reset_index(drop=True)