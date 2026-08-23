"""
End-to-end orchestration:

  clean_dataset.json + wallet_features_real.csv
    -> wallet transaction features
    -> merge with graph features (wallet_id)
    -> select + clean ML feature matrix
    -> Isolation Forest
    -> anomaly_score -> risk_score -> risk_level
    -> explanations
    -> output CSV/JSON for backend

Run as:
    python -m ml.pipeline --transactions <path> --wallet-features <path> --output <path>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

from ml.ingest import load_transactions, load_wallet_graph_features
from ml.transaction_features import compute_wallet_transaction_features
from ml.merge import merge_wallet_features, MergeValidationError
from ml.preprocessing import select_ml_features, clean_feature_matrix
from ml.model import fit_isolation_forest
from ml.risk_scoring import compute_risk_scores, compute_risk_level
from ml.explain import explain_wallets


def run_pipeline(
    transactions_path: str,
    wallet_features_path: str,
    output_path: str,
    n_estimators: int = 100,
    contamination: float = 0.05,
    random_state: int = 42,
) -> dict:
    print(f"Loading transactions from {transactions_path} ...")
    transactions = load_transactions(transactions_path)
    print(f"  {len(transactions)} transactions loaded.")

    print(f"Loading wallet graph features from {wallet_features_path} ...")
    graph_features = load_wallet_graph_features(wallet_features_path)
    print(f"  {len(graph_features)} wallet rows loaded.")

    print("Computing wallet-level transaction features ...")
    tx_features = compute_wallet_transaction_features(transactions)
    print(f"  {len(tx_features)} wallets with transaction-derived features.")

    print("Merging transaction features with graph features on wallet_id ...")
    try:
        merged, coverage_report = merge_wallet_features(tx_features, graph_features)
    except MergeValidationError as e:
        print(f"MERGE VALIDATION FAILED: {e}", file=sys.stderr)
        raise
    print(f"  Merge coverage: {coverage_report}")
    print(f"  Merged table: {len(merged)} rows.")

    if merged["wallet_id"].duplicated().any():
        raise MergeValidationError("Post-merge table contains duplicate wallet_id values.")

    print("Selecting ML feature columns ...")
    feature_df, feature_cols = select_ml_features(merged)
    print(f"  {len(feature_cols)} candidate features selected: {feature_cols}")

    print("Cleaning feature matrix (missing/infinite/constant handling) ...")
    feature_df, clean_report = clean_feature_matrix(feature_df)
    print(f"  Cleaning report: {clean_report}")

    print(
        f"Fitting Isolation Forest "
        f"(n_estimators={n_estimators}, contamination={contamination}, random_state={random_state}) ..."
    )
    model, raw_anomaly_score = fit_isolation_forest(
        feature_df,
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=random_state,
    )
    print(f"  Model fitted on {len(feature_df)} wallets, {feature_df.shape[1]} features.")

    print("Computing risk scores and levels ...")
    risk_score = compute_risk_scores(raw_anomaly_score)
    risk_score.index = merged.index
    risk_level = compute_risk_level(risk_score)

    print("Generating explanations ...")
    reasons = explain_wallets(feature_df, merged["wallet_id"], top_n=3)

    results = pd.DataFrame({
        "wallet_id": merged["wallet_id"].values,
        "anomaly_score": raw_anomaly_score,
        "risk_score": risk_score.values,
        "risk_level": risk_level.values,
        "reasons": reasons.values,
    })

    if results["wallet_id"].duplicated().any():
        raise MergeValidationError("Final results contain duplicate wallet_id values.")
    if results[["anomaly_score", "risk_score"]].isna().any().any():
        raise ValueError("Final results contain NaN anomaly_score or risk_score values.")

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    results_for_csv = results.copy()
    results_for_csv["reasons"] = results_for_csv["reasons"].apply(json.dumps)
    results_for_csv.to_csv(output_path, index=False)

    json_output_path = output_path.with_suffix(".json")
    results.to_json(json_output_path, orient="records", indent=2)

    print(f"Results written to {output_path} and {json_output_path}")

    risk_counts = results["risk_level"].value_counts().to_dict()

    return {
        "n_wallets": len(results),
        "n_features": feature_df.shape[1],
        "feature_columns": feature_cols,
        "risk_level_counts": risk_counts,
        "merge_coverage": coverage_report,
        "clean_report": clean_report,
        "output_csv": str(output_path),
        "output_json": str(json_output_path),
        "results": results,
    }


def main():
    parser = argparse.ArgumentParser(description="Osin's Bitcoin Forensics ML pipeline")
    parser.add_argument("--transactions", required=True, help="Path to clean_dataset.json")
    parser.add_argument("--wallet-features", required=True, help="Path to wallet_features_real.csv")
    parser.add_argument("--output", required=True, help="Path to write results CSV")
    parser.add_argument("--n-estimators", type=int, default=100)
    parser.add_argument("--contamination", type=float, default=0.05)
    parser.add_argument("--random-state", type=int, default=42)
    args = parser.parse_args()

    summary = run_pipeline(
        transactions_path=args.transactions,
        wallet_features_path=args.wallet_features,
        output_path=args.output,
        n_estimators=args.n_estimators,
        contamination=args.contamination,
        random_state=args.random_state,
    )

    print("\n=== SUMMARY ===")
    print(f"Wallets processed: {summary['n_wallets']}")
    print(f"Features used: {summary['n_features']}")
    print(f"Risk level counts: {summary['risk_level_counts']}")


if __name__ == "__main__":
    main()