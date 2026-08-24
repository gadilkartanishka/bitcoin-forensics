import networkx as nx
import numpy as np
from sqlalchemy.orm import Session
from sklearn.ensemble import IsolationForest
from app import models


def process_dataset_intelligence(db: Session):
    """
    Real-time end-to-end Graph & ML Intelligence Pipeline.
    Triggered immediately whenever a new dataset (CSV, JSON, XML) is uploaded.
    """
    wallets = db.query(models.Wallet).all()
    transactions = db.query(models.Transaction).all()

    if not wallets:
        return {"wallets_processed": 0, "alerts_generated": 0}

    # 1. Build in-memory NetworkX bipartite graph for topological analysis
    g = nx.DiGraph()
    for tx in transactions:
        tx_node = f"tx:{tx.txid}"
        g.add_node(tx_node, type="transaction")
        for inp in tx.inputs:
            g.add_node(inp.wallet_id, type="wallet")
            g.add_edge(inp.wallet_id, tx_node, weight=inp.amount or 0.0)
        for out in tx.outputs:
            g.add_node(out.wallet_id, type="wallet")
            g.add_edge(tx_node, out.wallet_id, weight=out.amount or 0.0)

    # Compute PageRank if graph has edges
    pagerank_scores = {}
    if g.number_of_edges() > 0:
        try:
            pagerank_scores = nx.pagerank(g, alpha=0.85, max_iter=100)
        except Exception:
            pagerank_scores = {}

    # Compute communities via connected components on undirected projection
    community_map = {}
    try:
        undirected = g.to_undirected()
        components = list(nx.connected_components(undirected))
        for comp_id, comp_nodes in enumerate(components, start=1):
            for node in comp_nodes:
                community_map[node] = (comp_id, len(comp_nodes))
    except Exception:
        community_map = {}

    # 2. Extract feature matrix for ML Anomaly Detection
    feature_rows = []
    wallet_objects = []

    for w in wallets:
        in_deg = len(w.inputs)
        out_deg = len(w.outputs)
        total_deg = in_deg + out_deg

        w.in_degree = in_deg
        w.out_degree = out_deg
        w.degree = total_deg
        w.pagerank = float(pagerank_scores.get(w.wallet_id, 0.001))

        if w.wallet_id in community_map:
            cid, csize = community_map[w.wallet_id]
            w.community_id = cid
            w.community_size = csize
        else:
            w.community_id = 1
            w.community_size = 1

        total_sent = sum((inp.amount or 0.0) for inp in w.inputs)
        total_recv = sum((out.amount or 0.0) for out in w.outputs)

        feature_rows.append([
            float(total_deg),
            float(in_deg),
            float(out_deg),
            float(total_sent),
            float(total_recv),
            float(w.pagerank),
        ])
        wallet_objects.append(w)

    # 3. Fit Isolation Forest Anomaly Detection Model
    X = np.array(feature_rows, dtype=np.float64)
    if len(X) >= 5:
        iso = IsolationForest(
            n_estimators=50,
            contamination=0.08,
            random_state=42,
        )
        iso.fit(X)
        raw_scores = -iso.score_samples(X)  # Higher = More anomalous
    else:
        # Fallback linear score if dataset is very small
        raw_scores = np.array([r[0] * 10.0 for r in feature_rows])

    # Convert raw anomaly scores to 0-100 percentile ranks
    ranks = np.argsort(np.argsort(raw_scores))
    percentiles = (ranks + 1) / len(ranks) * 100.0

    for i, w in enumerate(wallet_objects):
        p_score = round(float(percentiles[i]), 1)
        w.risk_score = p_score
        w.anomaly_score = round(float(raw_scores[i]), 4)
        w.risk_level = "HIGH" if p_score >= 80.0 else "MEDIUM" if p_score >= 50.0 else "LOW"

    # 4. Generate prioritized Alerts for High-Risk Wallets
    high_risk = sorted([w for w in wallet_objects if w.risk_level == "HIGH"], key=lambda x: x.risk_score, reverse=True)

    db.query(models.Alert).delete()
    alerts_created = 0
    for idx, hw in enumerate(high_risk[:15], start=1):
        reason = f"High graph degree ({hw.degree} txs) · Isolation Forest anomaly rank ({hw.risk_score}%)"
        if hw.pagerank and hw.pagerank > 0.005:
            reason += " · Elevated PageRank aggregation"
        alert = models.Alert(
            id=idx,
            entity_id=hw.wallet_id,
            entity_type="Wallet",
            final_risk_score=hw.risk_score,
            reasons=reason,
        )
        db.add(alert)
        alerts_created += 1

    db.commit()

    return {
        "wallets_processed": len(wallet_objects),
        "high_risk_count": len(high_risk),
        "alerts_generated": alerts_created,
    }
