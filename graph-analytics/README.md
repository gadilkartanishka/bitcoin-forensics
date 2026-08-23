# Graph / Blockchain Analytics — SIH26146

Kshitij's module for the Bitcoin transaction monitoring system.
Builds the entity/transaction graph and computes per-wallet graph
features, feeding Osin (ML), Shreeja (backend/storage), and Tanushri
(visualization).

## Setup

```bash
pip install -r requirements.txt
```

## Running the pipeline

python main.py                                   # strict mode, default input path
python main.py --input path/to/other_file.json    # point at any dataset
python main.py --lenient                          # skip invalid records, writes data_quality_report.json

Outputs go to `data/real/wallet_features_real.csv` (for Osin) and
`data/real/viz_export_real.json` (for Tanushri).
``

## Design decision: multi-input/multi-output transactions

A Bitcoin transaction can have several input wallets and several
output wallets. We model each transaction as its own **node**
(wallet -> TX -> wallet), not a flattened wallet-to-wallet edge, so
this ambiguity is never silently resolved incorrectly. See
`graph_builder.py` for details, and `tests/test_graph_builder.py` for
a concrete example this protects against.

A lossy wallet-to-wallet **projection** is also provided for cases
that need a simpler view (e.g. quick visualizations) — use the full
graph for anything feeding features or ML.

## Module map

| File | Purpose | Consumed by |
|---|---|---|
| `ingest.py` | Loads clean transaction records | internal (only file that changes when Bhargavi's schema lands) |
| `graph_builder.py` | Builds the bipartite graph + wallet projection | features.py, traversal.py, exports |
| `features.py` | Per-wallet graph features (degree, PageRank, centrality) | export_features.py |
| `traversal.py` | N-hop neighborhood queries | Shreeja (via `GET /graph/{entity}`) |
| `export_viz.py` | `{nodes, edges}` JSON | Tanushri |
| `export_features.py` | Wallet feature CSV | Osin |

