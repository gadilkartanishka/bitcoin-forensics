# Bitcoin Forensics — Backend

FastAPI backend for the Bitcoin transaction forensics and anomaly detection system. Handles the database, APIs, and integration of data from the ML, graph analytics, and data engineering pipelines.

## Tech Stack

- FastAPI
- SQLAlchemy + PostgreSQL (Supabase)
- Python 3.13

## Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```
## Setup: GeoIP Database (required)
This file is not included in the repo (too large for git).

1. Sign up free: https://www.maxmind.com/en/geolite2/signup
2. Download "GeoLite City" — GeoIP2 Binary (.mmdb) format
3. Extract and place the file at: backend/data/GeoLite2-City.mmdb

Create database tables:

```powershell
python -c "from app.database import Base, engine; from app import models; Base.metadata.create_all(bind=engine); print('Tables created')"
```

Run the server:

```powershell
uvicorn app.main:app --reload
```

Server runs at `http://127.0.0.1:8000`. Interactive API docs at `http://127.0.0.1:8000/docs`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/wallet/{wallet_id}` | Get a single wallet's data |
| GET | `/transaction/{txid}` | Get a single transaction's data |
| POST | `/dataset/upload` | Upload cleaned transaction dataset (CSV/JSON/XML) |
| POST | `/graph-features/upload` | Upload wallet graph features CSV (degree, pagerank, community_id, etc.) |
| POST | `/ml/upload-results` | Upload ML risk-scoring results (CSV/JSON) |
| GET | `/graph/{entity}?hops=N` | Get graph traversal centered on a wallet, up to N hops (default 2, max 5) |
| GET | `/alerts?risk_level=&limit=` | Get ranked alerts, optional filter by LOW/MEDIUM/HIGH |
| GET | `/statistics` | Get aggregate counts (wallets, transactions, alerts, risk breakdown) |
| GET | `/clusters` | Get wallets grouped by community_id |

## Data Loading Order

Run the three upload endpoints in this order for a full dataset load:

1. **`POST /graph-features/upload`** — Kshitij's `wallet_features_real.csv`
2. **`POST /dataset/upload`** — Bhargavi's `clean_dataset.json`
3. **`POST /ml/upload-results`** — Osin's `wallet_risk_results.json` / `.csv`

## Database Schema

- **wallets** — `wallet_id`, graph features (`degree`, `pagerank`, `centrality`, `community_id`, `community_size`), ML output (`anomaly_score`, `risk_score`, `risk_level`, `cluster_id`)
- **transactions** — `txid`, `timestamp` (UTC), src/dst IP + geo/ASN, amounts, `fee`, `script_type`, `flag_amount_mismatch`, `amount_mismatch_delta`
- **tx_inputs / tx_outputs** — junction tables modeling multi-input/multi-output transactions
- **ips** — IP address nodes for graph traversal
- **alerts** — ranked risk entries with explanation reasons, generated for MEDIUM/HIGH risk wallets

## Notes

- `risk_score` is a percentile rank (0–100) relative to the current wallet population, not a calibrated fraud probability.
- Graph edges in `/graph/{entity}` are derived live from `tx_inputs`/`tx_outputs` joins, not a precomputed edge table.