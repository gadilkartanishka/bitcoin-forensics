/**
 * Live API Client for Bitcoin Forensics Backend
 * Connects directly to FastAPI endpoints.
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Statistics & Summary Metrics
  getStatistics: async () => {
    return request("/statistics");
  },

  // Alerts
  getAlerts: async (riskLevel = null, limit = 50) => {
    const params = new URLSearchParams();
    if (riskLevel) params.append("risk_level", riskLevel);
    if (limit) params.append("limit", limit.toString());
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/alerts${qs}`);
  },

  // Wallets
  getWallets: async ({ riskLevel = null, limit = 50, offset = 0, sortByRisk = true } = {}) => {
    const params = new URLSearchParams();
    if (riskLevel) params.append("risk_level", riskLevel);
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    if (sortByRisk !== undefined) params.append("sort_by_risk", sortByRisk.toString());
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/wallet${qs}`);
  },

  getWallet: async (walletId) => {
    return request(`/wallet/${encodeURIComponent(walletId)}`);
  },

  // Transactions
  getTransactions: async ({ limit = 50, offset = 0, flaggedOnly = false } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    if (flaggedOnly) params.append("flagged_only", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";
    return request(`/transaction${qs}`);
  },

  getTransaction: async (txid) => {
    return request(`/transaction/${encodeURIComponent(txid)}`);
  },

  // Dynamic Graph Traversal
  getGraph: async (entityId, hops = 2) => {
    return request(`/graph/${encodeURIComponent(entityId)}?hops=${hops}`);
  },

  // Clusters / Communities
  getClusters: async () => {
    return request("/clusters");
  },

  // Dataset Upload
  uploadDataset: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/dataset/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload Failed ${response.status}: ${errorText}`);
    }

    return response.json();
  },
};

export default api;
