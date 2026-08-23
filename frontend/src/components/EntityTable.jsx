import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";

function RiskBadge({ score }) {
  if (score >= 90) {
    // High risk: solid filled intelligence blue badge, white text
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-bold font-mono rounded bg-accent text-white tracking-tight">
        {score}%
      </span>
    );
  }
  if (score >= 70) {
    // Medium risk: outlined badge, intelligence blue text
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-semibold font-mono rounded border border-accent/50 text-accent bg-accent/10">
        {score}%
      </span>
    );
  }
  // Low risk: plain gray monospace text
  return (
    <span className="text-text-faint font-mono text-xs px-2 py-0.5">
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

export function EntityTable({ entities, onSelectEntity = () => {} }) {
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

  const sorted = [...entities].sort((a, b) => {
    const av = a[sortKey] ?? -1;
    const bv = b[sortKey] ?? -1;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const headers = [
    { key: "id", label: "Entity", sortable: false },
    { key: "txn_count", label: "Txns", sortable: true },
    { key: "country_count", label: "Countries", sortable: true },
    { key: "risk_score", label: "Risk score", sortable: true },
    { key: "trend", label: "Trend", sortable: true },
  ];

  return (
    <div
      className="rounded-xl border border-border bg-surface overflow-hidden"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-slate-50/90">
            {headers.map((h) => (
              <th
                key={h.key}
                className={`px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted ${
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
          {sorted.map((e) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
