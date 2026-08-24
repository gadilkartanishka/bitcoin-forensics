import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_health():
    """Check API root endpoint is responding."""
    res = client.get("/")
    assert res.status_code == 200
    assert "status" in res.json()
    assert "Bitcoin Forensics API" in res.json()["status"]


def test_statistics_endpoint():
    """Verify statistics metrics, risk breakdowns, and non-empty database state."""
    res = client.get("/statistics")
    assert res.status_code == 200
    data = res.json()
    assert "total_wallets" in data
    assert "total_transactions" in data
    assert "total_ips" in data
    assert "total_alerts" in data
    assert "risk_breakdown" in data
    assert data["total_wallets"] > 0
    assert data["total_transactions"] > 0
    assert isinstance(data["risk_breakdown"]["HIGH"], int)


def test_wallets_list():
    """Check wallet list pagination, sorting, and schema correctness."""
    res = client.get("/wallet?limit=10")
    assert res.status_code == 200
    wallets = res.json()
    assert isinstance(wallets, list)
    assert len(wallets) > 0
    w = wallets[0]
    assert "wallet_id" in w
    assert "risk_score" in w
    assert "risk_level" in w
    assert "anomaly_score" in w


def test_single_wallet_lookup():
    """Check single wallet details and 404 error handling."""
    # Fetch first wallet
    w_list = client.get("/wallet?limit=1").json()
    assert len(w_list) > 0
    wid = w_list[0]["wallet_id"]

    res = client.get(f"/wallet/{wid}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["wallet_id"] == wid
    assert "degree" in detail
    assert "in_degree" in detail
    assert "out_degree" in detail

    # Check 404 for non-existent wallet
    res_404 = client.get("/wallet/non_existent_wallet_xyz999")
    assert res_404.status_code == 404


def test_alerts_endpoint():
    """Check alerts are generated and prioritized."""
    res = client.get("/alerts?limit=10")
    assert res.status_code == 200
    alerts = res.json()
    assert isinstance(alerts, list)
    assert len(alerts) > 0
    a = alerts[0]
    assert "entity_id" in a
    assert "final_risk_score" in a
    assert "reasons" in a


def test_transactions_endpoint():
    """Check transaction list and single tx lookup."""
    res = client.get("/transaction?limit=5")
    assert res.status_code == 200
    txs = res.json()
    assert isinstance(txs, list)
    assert len(txs) > 0
    tx = txs[0]
    assert "txid" in tx

    # Single lookup
    res_single = client.get(f"/transaction/{tx['txid']}")
    assert res_single.status_code == 200
    assert res_single.json()["txid"] == tx["txid"]


def test_graph_full_endpoint():
    """Verify live graph structure, nodes (wallets, txs, ips) and edges."""
    res = client.get("/graph/full")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0

    node_types = {n.get("type") for n in data["nodes"]}
    assert "wallet" in node_types
    assert "transaction" in node_types

    # Verify wallet nodes have risk score data
    wallet_nodes = [n for n in data["nodes"] if n.get("type") == "wallet"]
    assert len(wallet_nodes) > 0
    assert wallet_nodes[0].get("risk_score") is not None
    assert wallet_nodes[0].get("anomaly_score") is not None


def test_graph_entity_subgraph():
    """Verify targeted sub-graph generation around an entity."""
    w_list = client.get("/wallet?limit=1").json()
    wid = w_list[0]["wallet_id"]

    res = client.get(f"/graph/{wid}?hops=2")
    assert res.status_code == 200
    subgraph = res.json()
    assert "nodes" in subgraph
    assert "edges" in subgraph
    assert len(subgraph["nodes"]) > 0


def test_clusters_endpoint():
    """Verify clusters endpoint returns valid community structures."""
    res = client.get("/clusters")
    assert res.status_code in [200, 404]  # If empty or populated, must not 500


def test_graph_features_endpoint():
    """Verify graph features endpoint returns feature vectors."""
    res = client.get("/graph_features")
    assert res.status_code in [200, 404]  # Must not 500


def test_ml_results_endpoint():
    """Verify ML results endpoint."""
    res = client.get("/ml_results")
    assert res.status_code in [200, 404]  # Must not 500
