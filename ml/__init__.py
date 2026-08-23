"""
Osin's ML/AI module for the Bitcoin Forensic Investigation Platform.

Pipeline: clean transaction data + Kshitij's wallet graph features
          -> wallet-level ML feature table -> preprocessing
          -> Isolation Forest -> anomaly score -> risk score/level
          -> explainable reasons -> output for backend.

This is unsupervised anomaly detection. There is no ground-truth fraud
label in this dataset, so nothing produced here should be described as
"confirmed fraud" -- only as relative anomaly ranking.
"""