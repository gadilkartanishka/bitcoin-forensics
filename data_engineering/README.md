# Data Engineering Module

Run:
    python pipeline.py

Input: files in /raw (CSV, JSON, XML)
Output: output/clean_dataset.json

Schema: see schema example in team doc / this README.
Known limitations: GeoIP currently uses placeholder data (Option B) —
swap geoip.py for MaxMind lookups (Option A) when time allows.
## How to use this module

### Setup
1. Create and activate a virtual environment:
python -m venv venv
venv\Scripts\activate

2. Install dependencies:

pip install -r requirements.txt


### Running the pipeline
Input files (CSV/JSON/XML) go in `raw/`. Run:

python pipeline.py

This loads, normalizes, validates, and GeoIP-enriches the data, then writes
the result to `output/clean_dataset.json`.

### Accessing the dataset
`output/` is gitignored — the generated dataset is not tracked in git.
Bhargavi will share `clean_dataset.json` directly (Drive/Slack) whenever
it's regenerated. If you want to run the pipeline yourself, drop your own
CSV/JSON/XML files into `raw/` and run `python pipeline.py`.

### Schema
Each record in `clean_dataset.json`:
- `timestamp` — UTC, format `YYYY-MM-DD HH:MM:SS UTC`
- `src_ip`, `dst_ip`, `src_port`, `dst_port`, `txid`
- `input_addresses`, `output_addresses` — lists (multi-in/multi-out supported)
- `input_amounts`, `output_amounts` — lists of floats (BTC, 8 decimal places)
- `fee`, `script_type` — may be null if absent from source data
- `flag_amount_mismatch` — bool, structural check (list length mismatch)
- `amount_mismatch_delta` — signed float, total_input − total_output (BTC)
- `src_geo_country`, `src_asn`, `dst_geo_country`, `dst_asn` — may be null
  for private/reserved IPs or gaps in the free GeoLite2-ASN database

See "Assumptions" section above for known limitations pending the real
organizer dataset.