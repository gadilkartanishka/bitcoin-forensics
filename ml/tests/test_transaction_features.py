import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.transaction_features import compute_wallet_transaction_features


def make_tx(txid, inputs, in_amts, outputs, out_amts,
            src_country="US", dst_country="US", src_asn="AS1", dst_asn="AS2"):
    return {
        "txid": txid,
        "timestamp": "2026-01-01 00:00:00 UTC",
        "src_ip": "1.1.1.1",
        "dst_ip": "2.2.2.2",
        "input_addresses": inputs,
        "input_amounts": in_amts,
        "output_addresses": outputs,
        "output_amounts": out_amts,
        "fee": 0.0001,
        "script_type": "P2PKH",
        "flag_amount_mismatch": False,
        "amount_mismatch_delta": 0.0,
        "src_geo_country": src_country,
        "src_asn": src_asn,
        "dst_geo_country": dst_country,
        "dst_asn": dst_asn,
    }


def test_simple_one_to_one():
    txs = [make_tx("t1", ["a"], [1.0], ["b"], [0.9])]
    df = compute_wallet_transaction_features(txs)
    a = df[df.wallet_id == "a"].iloc[0]
    b = df[df.wallet_id == "b"].iloc[0]
    assert a.total_sent == 1.0
    assert a.total_received == 0.0
    assert b.total_received == 0.9
    assert b.total_sent == 0.0


def test_multi_input_multi_output_not_zipped():
    """Different-length input/output lists must not be zipped together --
    each list's addresses must only pair with amounts from the SAME list."""
    txs = [make_tx(
        "t1",
        inputs=["a", "b", "c"],
        in_amts=[1.0, 2.0, 3.0],
        outputs=["x", "y"],
        out_amts=[4.0, 1.0],
    )]
    df = compute_wallet_transaction_features(txs)

    # inputs
    assert df[df.wallet_id == "a"].iloc[0].total_sent == 1.0
    assert df[df.wallet_id == "b"].iloc[0].total_sent == 2.0
    assert df[df.wallet_id == "c"].iloc[0].total_sent == 3.0

    # outputs
    assert df[df.wallet_id == "x"].iloc[0].total_received == 4.0
    assert df[df.wallet_id == "y"].iloc[0].total_received == 1.0

    # no wallet should have picked up an amount from the "wrong" list
    for wid in ["a", "b", "c"]:
        assert df[df.wallet_id == wid].iloc[0].total_received == 0.0
    for wid in ["x", "y"]:
        assert df[df.wallet_id == wid].iloc[0].total_sent == 0.0


def test_wallet_appearing_as_both_sender_and_receiver():
    txs = [
        make_tx("t1", ["a"], [1.0], ["b"], [0.9]),
        make_tx("t2", ["c"], [2.0], ["a"], [1.9]),
    ]
    df = compute_wallet_transaction_features(txs)
    a = df[df.wallet_id == "a"].iloc[0]
    assert a.total_sent == 1.0
    assert a.total_received == 1.9
    assert a.net_flow == 1.9 - 1.0


def test_avg_amounts_computed_correctly():
    txs = [
        make_tx("t1", ["a", "a"], [1.0, 3.0], ["b"], [0.9]),
    ]
    # Note: same wallet appearing twice as input within one tx's list --
    # both amounts should be counted.
    df = compute_wallet_transaction_features(txs)
    a = df[df.wallet_id == "a"].iloc[0]
    assert a.total_sent == 4.0
    assert a.avg_sent_amount == 2.0


def test_country_asn_association_by_side():
    txs = [
        make_tx("t1", ["a"], [1.0], ["b"], [0.9], src_country="India", dst_country="Germany",
                src_asn="AS100", dst_asn="AS200"),
    ]
    df = compute_wallet_transaction_features(txs)
    a = df[df.wallet_id == "a"].iloc[0]
    b = df[df.wallet_id == "b"].iloc[0]
    assert a.unique_countries_touched == 1  # India (input side)
    assert b.unique_countries_touched == 1  # Germany (output side)
    assert a.unique_asns_touched == 1
    assert b.unique_asns_touched == 1


def test_all_wallets_captured_no_missing():
    txs = [make_tx("t1", ["a", "b"], [1.0, 2.0], ["c", "d", "e"], [1.0, 1.0, 1.0])]
    df = compute_wallet_transaction_features(txs)
    assert set(df.wallet_id) == {"a", "b", "c", "d", "e"}
    assert len(df) == 5