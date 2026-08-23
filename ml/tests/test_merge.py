import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.merge import merge_wallet_features, MergeValidationError


def test_simple_merge():
    tx_features = pd.DataFrame({
        "wallet_id": ["a", "b"],
        "total_sent": [1.0, 2.0],
    })
    graph_features = pd.DataFrame({
        "wallet_id": ["a", "b"],
        "pagerank": [0.1, 0.2],
    })
    merged, coverage = merge_wallet_features(tx_features, graph_features)
    assert len(merged) == 2
    assert set(merged.columns) == {"wallet_id", "total_sent", "pagerank"}
    assert coverage["common_wallets"] == 2
    assert coverage["only_in_tx_features"] == 0
    assert coverage["only_in_graph_features"] == 0


def test_merge_detects_duplicate_wallet_id_in_graph_features():
    tx_features = pd.DataFrame({"wallet_id": ["a", "b"], "total_sent": [1.0, 2.0]})
    graph_features = pd.DataFrame({
        "wallet_id": ["a", "a"],
        "pagerank": [0.1, 0.15],
    })
    with pytest.raises(MergeValidationError):
        merge_wallet_features(tx_features, graph_features)


def test_merge_detects_duplicate_wallet_id_in_tx_features():
    tx_features = pd.DataFrame({"wallet_id": ["a", "a"], "total_sent": [1.0, 2.0]})
    graph_features = pd.DataFrame({"wallet_id": ["a", "b"], "pagerank": [0.1, 0.2]})
    with pytest.raises(MergeValidationError):
        merge_wallet_features(tx_features, graph_features)


def test_merge_reports_uncovered_wallets():
    tx_features = pd.DataFrame({"wallet_id": ["a", "b", "c"], "total_sent": [1.0, 2.0, 3.0]})
    graph_features = pd.DataFrame({"wallet_id": ["b", "c", "d"], "pagerank": [0.1, 0.2, 0.3]})
    merged, coverage = merge_wallet_features(tx_features, graph_features)
    assert coverage["only_in_tx_features"] == 1  # "a"
    assert coverage["only_in_graph_features"] == 1  # "d"
    assert coverage["common_wallets"] == 2  # "b", "c"
    assert len(merged) == 2