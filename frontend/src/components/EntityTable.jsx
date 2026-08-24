import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";

function RiskBadge({ score }) {
  if (score >= 90) {
    return (
      <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold font-mono rounded-[28.8px] bg-accent text-white tracking-tight tabular-nums shadow-sm">
        {score}%
      </span>
    );
  }
  if (score >= 70) {
    return (
      <span className="inline-block px-2.5 py-0.5 text-[11px] font-semibold font-mono rounded-[28.8px] border border-accent/50 text-accent bg-accent/10 tabular-nums">
        {score}%
      </span>
    );
  }
  return (
    <span className="text-text-faint font-mono text-xs px-2.5 py-0.5 tabular-nums">
      {score}%
    </span>
  );
}

function TrendCell({ trend }) {
  if (trend > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-accent font-mono text-xs tabular-nums font-medium">
        <TrendingUp size={13} />
        +{trend}%
      </span>
    );
  }
  if (trend < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-text-muted font-mono text-xs tabular-nums">
        <TrendingDown size={13} />
        {trend}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-text-faint font-mono text-xs tabular-nums">
      <Minus size={13} />
      0%
    </span>
  );
}

export function EntityTable({ entities = [], onSelectEntity = () => {} }) {
  const [sortKey, setSortKey] = useState("risk_score");
  const [sortDir, setSortDir] = useState("desc");

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const normalizedEntities = (entities || []).map((e) => ({
    id: e.wallet_id || e.id || "Unknown",
    txn_count: e.txn_count ?? e.degree ?? ((e.in_degree || 0) + (e.out_degree || 0)) ?? 0,
    country_count: e.country_count ?? (e.community_id != null ? `C-${e.community_id}` : 1),
    risk_score: Math.round(e.risk_score ?? ((e.anomaly_score || 0) * 100) ?? 0),
    trend: e.trend ?? (e.risk_score >= 80 ? 12 : e.risk_score >= 50 ? 5 : 0),
  }));

  const sorted = [...normalizedEntities].sort((a, b) => {
    const av = a[sortKey] ?? -1;
    const bv = b[sortKey] ?? -1;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const headers = [
    { key: "id", label: "Entity", sortable: false },
    { key: "txn_count", label: "Txns / Degree", sortable: true },
    { key: "country_count", label: "Cluster / Geo", sortable: true },
    { key: "risk_score", label: "Risk score", sortable: true },
    { key: "trend", label: "Trend", sortable: true },
    { key: "action", label: "Inspect", sortable: false },
  ];

  return (
    <div
      className="rounded-[9px] border border-border bg-surface overflow-hidden shadow-sm"
    >
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-slate-50/90">
            {headers.map((h) => (
              <th
                key={h.key}
                className={`px-4 py-2.5 text-left text-[11px] font-medium uppercase text-text-muted tracking-wider ${
                  h.sortable ? "cursor-pointer select-none hover:text-text-primary" : ""
                }`}
                onClick={() => h.sortable && handleSort(h.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {h.label}
                  {h.sortable && sortKey === h.key && (
                    <ChevronDown
                      size={12}
                      className={
                        sortDir === "asc"
                          ? "rotate-180 text-accent"
                          : "text-accent"
                      }
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-6 text-text-muted">
                No entities found.
              </td>
            </tr>
          ) : (
            sorted.map((e) => (
              <tr
                key={e.id}
                onClick={() => onSelectEntity(e.id)}
                className="border-b border-border-subtle last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <td className="px-4 py-2.5 font-mono font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {e.id}
                </td>
                <td className="px-4 py-2.5 font-mono text-text-muted tabular-nums">
                  {e.txn_count != null ? e.txn_count.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2.5 font-mono text-text-muted tabular-nums">
                  {e.country_count}
                </td>
                <td className="px-4 py-2.5">
                  <RiskBadge score={e.risk_score} />
                </td>
                <td className="px-4 py-2.5">
                  <TrendCell trend={e.trend} />
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onSelectEntity(e.id);
                    }}
                    className="px-3 py-1 text-[11px] font-medium font-mono rounded-[28.8px] bg-shell hover:bg-accent hover:text-white text-text-secondary transition-colors cursor-pointer"
                  >
                    View Dossier
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
