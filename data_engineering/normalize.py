import pandas as pd
from dateutil import parser as dateparser
import pytz

def normalize_timestamp(ts):          # REPLACES your old normalize_timestamp
    try:
        dt = dateparser.parse(str(ts))
        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt)
        else:
            dt = dt.astimezone(pytz.utc)
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception:
        return None

def normalize_address(addr):
    if not isinstance(addr, str):
        return addr
    return addr.strip()

def normalize_ip(ip):
    if not isinstance(ip, str):
        return ip
    return ip.strip()

def normalize_amount(a):
    try:
        return round(float(a), 8)
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

    if "fee" in df.columns:
        df["fee"] = pd.to_numeric(df["fee"], errors="coerce").round(8)
    else:
        df["fee"] = None

    if "script_type" in df.columns:
        df["script_type"] = df["script_type"].apply(lambda x: x.strip() if isinstance(x, str) else None)
    else:
        df["script_type"] = None

    before = len(df)
    df = df[df["timestamp"].notna()]
    print(f"Dropped {before - len(df)} rows with unparseable timestamps")

    return df.reset_index(drop=True)