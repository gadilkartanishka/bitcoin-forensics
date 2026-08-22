# Data Engineering Module

Run:
    python pipeline.py

Input: files in /raw (CSV, JSON, XML)
Output: output/clean_dataset.json

Schema: see schema example in team doc / this README.
Known limitations: GeoIP currently uses placeholder data (Option B) —
swap geoip.py for MaxMind lookups (Option A) when time allows.