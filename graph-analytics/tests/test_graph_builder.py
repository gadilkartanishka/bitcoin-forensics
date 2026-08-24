import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from graph_builder import build_graph, wallet_to_wallet_projection  # noqa: E402


def make_tx(txid, inputs, outputs, in_amts, out_amts, flag_amount_mismatch=False,
            amount_mismatch_delta=0.0, src_country="US", dst_country="US",
            src_ip="10.0.0.1", dst_ip="10.0.0.2"):
    return {
        "txid": txid,
        "timestamp": "2026-06-01 00:00:00 UTC",
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "input_addresses": inputs,
        "output_addresses": outputs,
        "input_amounts": in_amts,
        "output_amounts": out_amts,
        "fee": 0.0001,
        "script_type": "P2PKH",
        "src_geo_country": src_country,
        "src_asn": "AS1",
        "dst_geo_country": dst_country,
        "dst_asn": "AS2",
        "flag_amount_mismatch": flag_amount_mismatch,
        "amount_mismatch_delta": amount_mismatch_delta,
    }


def test_simple_one_to_one():
    txs = [make_tx("t1", ["a"], ["b"], [1.0], [0.999])]
    g = build_graph(txs)
    assert g.has_edge("wallet:a", "tx:t1")
    assert g.has_edge("tx:t1", "wallet:b")


def test_multi_input_multi_output_preserved():
    txs = [make_tx("t1", ["a", "b"], ["c", "d"], [1.0, 2.0], [1.4, 1.5])]
    g = build_graph(txs)

    assert g.has_edge("wallet:a", "tx:t1")
    assert g.has_edge("wallet:b", "tx:t1")
    assert g.has_edge("tx:t1", "wallet:c")
    assert g.has_edge("tx:t1", "wallet:d")
    assert not g.has_edge("wallet:a", "wallet:c")


def test_wallet_projection_counts_shared_transactions():
    txs = [
        make_tx("t1", ["a", "b"], ["c"], [1.0, 1.0], [1.999]),
        make_tx("t2", ["a"], ["c"], [0.5], [0.499]),
    ]
    g = build_graph(txs)
    wg = wallet_to_wallet_projection(g)

    assert wg["wallet:a"]["wallet:c"]["weight"] == 2
    assert wg["wallet:b"]["wallet:c"]["weight"] == 1


def test_flag_amount_mismatch_passes_through_and_is_not_dropped():
    txs = [
        make_tx("t1", ["a"], ["b"], [1.0], [0.999], flag_amount_mismatch=True),
        make_tx("t2", ["a"], ["c"], [1.0], [0.999], flag_amount_mismatch=False),
    ]
    g = build_graph(txs)
    assert "tx:t1" in g and "tx:t2" in g
    assert g.nodes["tx:t1"]["flag_amount_mismatch"] is True
    assert g.nodes["tx:t2"]["flag_amount_mismatch"] is False

    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
    from features import compute_wallet_features

    df = compute_wallet_features(g)
    wallet_a = df[df["wallet_id"] == "a"].iloc[0]
    assert wallet_a["mismatch_tx_count"] == 1


def test_src_dst_ip_get_independent_geo_attribution():
    txs = [make_tx("t1", ["a"], ["b"], [1.0], [0.999],
                   src_country="India", dst_country="Germany",
                   src_ip="1.1.1.1", dst_ip="2.2.2.2")]
    g = build_graph(txs)
    assert g.nodes["ip:1.1.1.1"]["country"] == "India"
    assert g.nodes["ip:2.2.2.2"]["country"] == "Germany"


def test_cross_border_feature_detects_country_mismatch():
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
    from features import compute_wallet_features

    txs = [
        make_tx("t1", ["a"], ["b"], [1.0], [0.999],
                src_country="India", dst_country="Germany",
                src_ip="1.1.1.1", dst_ip="2.2.2.2"),
        make_tx("t2", ["a"], ["c"], [1.0], [0.999],
                src_country="US", dst_country="US",
                src_ip="3.3.3.3", dst_ip="4.4.4.4"),
    ]
    g = build_graph(txs)
    df = compute_wallet_features(g)
    wallet_a = df[df["wallet_id"] == "a"].iloc[0]
    assert wallet_a["cross_border_tx_count"] == 1


def test_max_abs_amount_mismatch_delta_uses_magnitude():
    import sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
    from features import compute_wallet_features

    txs = [
        make_tx("t1", ["a"], ["b"], [1.0], [0.999],
                flag_amount_mismatch=True, amount_mismatch_delta=-5.0),
        make_tx("t2", ["a"], ["c"], [1.0], [0.999],
                flag_amount_mismatch=True, amount_mismatch_delta=0.0001),
    ]
    g = build_graph(txs)
    df = compute_wallet_features(g)
    wallet_a = df[df["wallet_id"] == "a"].iloc[0]
    assert wallet_a["max_abs_amount_mismatch_delta"] == 5.0


if __name__ == "__main__":
    test_simple_one_to_one()
    test_multi_input_multi_output_preserved()
    test_wallet_projection_counts_shared_transactions()
    test_flag_amount_mismatch_passes_through_and_is_not_dropped()
    test_src_dst_ip_get_independent_geo_attribution()
    test_cross_border_feature_detects_country_mismatch()
    test_max_abs_amount_mismatch_delta_uses_magnitude()
    print("All tests passed.")
