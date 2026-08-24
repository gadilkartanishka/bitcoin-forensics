import json
import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.pipeline import run_pipeline


@pytest.fixture
def small_dataset(tmp_path):
    """Builds a small but structurally valid transaction dataset + matching
    wallet graph feature CSV, mirroring the real handoff schema."""
    transactions = []
    wallets = set()
    for i in range(30):
        inputs = [f"in_{i}_{j}" for j in range(1 + (i % 3))]
        outputs = [f"out_{i}_{j}" for j in range(1 + ((i + 1) % 3))]
        wallets.update(inputs)
        wallets.update(outputs)
        transactions.append({
            "timestamp": "2026-01-01 00:00:00 UTC",
            "src_ip": "1.1.1.1",
            "dst_ip": "2.2.2.2",
            "src_port": 1000 + i,
            "dst_port": 8333,
            "txid": f"tx{i:04d}",
            "input_addresses": inputs,
            "output_addresses": outputs,
            "input_amounts": [round(1.0 + 0.1 * j, 4) for j in range(len(inputs))],
            "output_amounts": [round(0.9 + 0.1 * j, 4) for j in range(len(outputs))],
            "fee": 0.0001,
            "script_type": "P2PKH",
            "flag_amount_mismatch": False,
            "amount_mismatch_delta": 0.001 * i,
            "src_geo_country": "United States",
            "src_asn": "AS1",
            "dst_geo_country": "Germany" if i % 4 == 0 else "United States",
            "dst_asn": "AS2",
        })

    tx_path = tmp_path / "clean_dataset.json"
    with open(tx_path, "w") as f:
        json.dump(transactions, f)

    graph_rows = []
    for idx, w in enumerate(sorted(wallets)):
        graph_rows.append({
            "wallet_id": w,
            "tx_as_sender": idx % 2,
            "tx_as_receiver": (idx + 1) % 2,
            "total_tx_count": 1,
            "mismatch_tx_count": 0,
            "max_abs_amount_mismatch_delta": 0.01 * idx,
            "cross_border_tx_count": idx % 3 == 0,
            "graph_degree": 1 + (idx % 3),
            "graph_in_degree": idx % 2,
            "graph_out_degree": (idx + 1) % 2,
            "pagerank": 0.001 * (idx + 1),
            "betweenness_centrality": 0.0,
            "unique_counterparties": 1 + (idx % 4),
            "community_id": idx,
            "community_size": 2 + (idx % 4),
        })
    graph_df = pd.DataFrame(graph_rows)
    graph_path = tmp_path / "wallet_features.csv"
    graph_df.to_csv(graph_path, index=False)

    return tx_path, graph_path, len(wallets)


def test_pipeline_runs_end_to_end(small_dataset, tmp_path):
    tx_path, graph_path, n_wallets = small_dataset
    output_path = tmp_path / "results.csv"

    summary = run_pipeline(
        transactions_path=str(tx_path),
        wallet_features_path=str(graph_path),
        output_path=str(output_path),
        n_estimators=50,
        contamination=0.1,
        random_state=42,
    )

    assert summary["n_wallets"] == n_wallets
    assert output_path.exists()

    results = summary["results"]
    assert len(results) == n_wallets
    assert results["wallet_id"].duplicated().sum() == 0
    assert results["anomaly_score"].isna().sum() == 0
    assert results["risk_score"].isna().sum() == 0
    assert set(results["risk_level"]) <= {"LOW", "MEDIUM", "HIGH"}
    assert results["risk_score"].min() >= 0
    assert results["risk_score"].max() <= 100
    assert results["reasons"].apply(lambda r: isinstance(r, list)).all()


def test_pipeline_output_files_written(small_dataset, tmp_path):
    tx_path, graph_path, n_wallets = small_dataset
    output_path = tmp_path / "results.csv"

    summary = run_pipeline(
        transactions_path=str(tx_path),
        wallet_features_path=str(graph_path),
        output_path=str(output_path),
    )

    csv_out = Path(summary["output_csv"])
    json_out = Path(summary["output_json"])
    assert csv_out.exists()
    assert json_out.exists()

    with open(json_out) as f:
        json_results = json.load(f)
    assert len(json_results) == n_wallets
    assert "risk_level" in json_results[0]
    assert "reasons" in json_results[0]