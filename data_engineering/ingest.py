import pandas as pd
import json
import xmltodict
import os

def detect_format(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".csv":
        return "csv"
    elif ext == ".json":
        return "json"
    elif ext == ".xml":
        return "xml"
    else:
        raise ValueError(f"Unsupported file format: {ext}")

def parse_csv(filepath):
    df = pd.read_csv(filepath, dtype=str)  # read everything as string first, cast later
    list_cols = ["input_addresses", "output_addresses", "input_amounts", "output_amounts"]
    for col in list_cols:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: x.split("|") if pd.notna(x) else [])
    return df

def parse_json(filepath):
    with open(filepath, "r") as f:
        data = json.load(f)
    return pd.DataFrame(data)

def parse_xml(filepath):
    with open(filepath, "r") as f:
        data = xmltodict.parse(f.read())
    records = data["transactions"]["transaction"]
    if isinstance(records, dict):  # single record edge case
        records = [records]
    df = pd.DataFrame(records)
    list_cols = ["input_addresses", "output_addresses", "input_amounts", "output_amounts"]
    for col in list_cols:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: x.split("|") if isinstance(x, str) else [])
    return df

def load_file(filepath):
    fmt = detect_format(filepath)
    if fmt == "csv":
        return parse_csv(filepath)
    elif fmt == "json":
        return parse_json(filepath)
    elif fmt == "xml":
        return parse_xml(filepath)

def load_and_merge(filepaths):
    """Load multiple files of mixed formats and merge into one DataFrame."""
    dfs = [load_file(fp) for fp in filepaths]
    merged = pd.concat(dfs, ignore_index=True)
    return merged

# if __name__ == "__main__":
#     df = load_and_merge(["raw/sample.csv", "raw/sample.json", "raw/sample.xml"])
#     print(df.shape)
#     print(df.head())