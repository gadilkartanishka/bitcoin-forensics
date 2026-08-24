"""
Single entry point for the graph-analytics pipeline: takes a clean
transaction dataset in, produces the graph, wallet feature CSV, and
viz JSON out.

Usage:
    python main.py                                    # uses default path below
    python main.py --input path/to/dataset.json
    python main.py --input path/to/dataset.json --lenient   # skip bad records instead of failing

The --input path is intentionally just a CLI argument, not hardcoded
to Bhargavi's repo/output folder — that keeps this script portable
across machines and lets it point at whatever the current data source
actually is (a static file today, possibly Shreeja's DB/API later).
"""

import argparse
import json
import sys
from pathlib import Path

src_dir = Path(__file__).resolve().parent / "src"
sys.path.insert(0, str(src_dir))

from ingest import load_transactions
from graph_builder import build_graph
from export_features import export_feature_table
from export_viz import export_for_viz


DEFAULT_INPUT = "data/real/clean_dataset.json"
FEATURES_OUT = "data/real/wallet_features_real.csv"
VIZ_OUT = "data/real/viz_export_real.json"


def run(input_path: str, lenient: bool = False):
    print(f"Loading transactions from {input_path} ...")

    if lenient:
        txs, report = load_transactions(input_path, strict=False)
        print(f"Loaded {report['valid_records']}/{report['total_records']} valid records")
        if report["invalid_records"]:
            print(f"WARNING: {report['invalid_records']} records skipped — "
                  f"see errors below, or check data_quality_report.json if written")
            for err in report["errors"][:5]:
                print(f"  - {err['txid']}: {err['error']}")
            with open("data/real/data_quality_report.json", "w") as f:
                json.dump(report, f, indent=2)
    else:
        txs = load_transactions(input_path, strict=True)
        print(f"Loaded {len(txs)} transactions (all valid)")

    print("Building graph ...")
    g = build_graph(txs)
    print(f"  {g.number_of_nodes()} nodes, {g.number_of_edges()} edges")

    print("Computing wallet features ...")
    df = export_feature_table(g, FEATURES_OUT)
    print(f"  {len(df)} wallet rows written to {FEATURES_OUT}")

    print("Exporting graph for visualization ...")
    viz = export_for_viz(g)
    with open(VIZ_OUT, "w") as f:
        json.dump(viz, f, indent=2)
    print(f"  {len(viz['nodes'])} nodes, {len(viz['edges'])} edges written to {VIZ_OUT}")

    print("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the graph-analytics pipeline end to end.")
    parser.add_argument("--input", default=DEFAULT_INPUT,
                         help=f"Path to clean transaction JSON (default: {DEFAULT_INPUT})")
    parser.add_argument("--lenient", action="store_true",
                         help="Skip invalid records instead of failing on the first one")
    args = parser.parse_args()

    run(args.input, lenient=args.lenient)