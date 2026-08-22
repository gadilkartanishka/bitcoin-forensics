from ingest import load_and_merge
from validate import validate
from normalize import normalize
from geoip import enrich_dataframe
import os

def run_pipeline(filepaths, output_path="output/clean_dataset.json"):
    print("Loading and merging files...")
    df = load_and_merge(filepaths)

    print("Validating...")
    df = validate(df)

    print("Normalizing...")
    df = normalize(df)

    print("Enriching with GeoIP...")
    df = enrich_dataframe(df)

    os.makedirs("output", exist_ok=True)
    df.to_json(output_path, orient="records", indent=2)
    print(f"Clean dataset written to {output_path} ({len(df)} rows)")
    return df

if __name__ == "__main__":
    run_pipeline(["raw/sample.csv", "raw/sample.json", "raw/sample.xml"])