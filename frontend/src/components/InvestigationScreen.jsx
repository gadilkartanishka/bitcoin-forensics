import { ArrowLeft, CheckCircle2, Waypoints, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { RiskGauge } from "./RiskGauge";
import InvestigationGraph from "./InvestigationGraph";

function RiskBadge({ score }) {
  if (score >= 90) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-bold font-mono rounded bg-accent text-white tracking-tight tabular-nums">
        {score}%
      </span>
    );
  }
  if (score >= 70) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-semibold font-mono rounded border border-accent/50 text-accent bg-accent/10 tabular-nums">
        {score}%
      </span>
    );
  }
  return (
    <span className="text-text-faint font-mono text-xs px-2 py-0.5 tabular-nums">
      {score}%
    </span>
  );
}

export function InvestigationScreen({
  entity,
  onBack,
  onSelectEntity,
  previousViewTitle = "Overview",
}) {
  if (!entity) return null;

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto pb-8">
      {/* Top Breadcrumb / Back Action */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer tracking-[-0.015em]"
        >
          <ArrowLeft size={14} />
          <span>Back to {previousViewTitle}</span>
        </button>
        <span className="text-xs font-mono text-text-faint tracking-[-0.015em]">
          Investigation ID: <span className="text-text-secondary">{entity.id}</span>
        </span>
      </div>

      {/* 1. HEADER HERO CARD with STATS ROW */}
      <div
        className="rounded-xl bg-surface p-5 border border-border flex flex-col gap-5"
        style={{
          boxShadow: "rgba(12, 41, 126, 0.07) 0px 0px 0px 1px inset",
        }}
      >
        {/* Header Title & Risk Score */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
                Entity Investigation
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-shell text-text-secondary tracking-[-0.015em]">
                {entity.type || "Wallet Entity"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-text-primary tracking-tight break-all">
              {entity.id}
            </h1>
            <p className="text-xs font-mono text-text-faint mt-1 break-all">
              {entity.fullId || entity.id}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
                Risk Score
              </p>
              <p className="text-xs font-mono text-accent font-medium tracking-[-0.015em]">
                {entity.risk_score >= 80 ? "High Anomaly Rating" : entity.risk_score >= 50 ? "Moderate Risk" : "Low Risk Profile"}
              </p>
            </div>
            <RiskGauge score={entity.risk_score || 0} />
          </div>
        </div>

        {/* 2. STATS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 border-t border-border-subtle pt-4">
          <div>
            <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
              Transactions
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5 tabular-nums">
              {entity.stats?.transactions != null
                ? entity.stats.transactions.toLocaleString()
                : "0"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
              Received
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5 tabular-nums">
              {entity.stats?.received_btc ?? entity.stats?.totalReceived ?? "0.00"}{" "}
              <span className="text-xs text-text-muted font-normal tracking-[-0.015em]">BTC</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
              Sent
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5 tabular-nums">
              {entity.stats?.sent_btc ?? entity.stats?.totalSent ?? "0.00"}{" "}
              <span className="text-xs text-text-muted font-normal tracking-[-0.015em]">BTC</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
              Unique IPs
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5 tabular-nums">
              {entity.stats?.unique_ips ?? (entity.stats?.transactions ? 2 : 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
              Cluster / Community
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5 tabular-nums">
              {entity.stats?.community ?? (entity.stats?.countries ?? "Cluster #1")}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
              Graph Hops
            </p>
            <p className="text-base font-bold font-mono text-accent mt-0.5 tabular-nums">
              {entity.stats?.hops_20min ?? entity.stats?.degree ?? 1}
            </p>
          </div>
        </div>
      </div>

      {/* 3. "WHY FLAGGED" — EVIDENCE SECTION */}
      <div
        className="rounded-xl bg-surface p-5 border border-border flex flex-col gap-3"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
            Why flagged — Anomaly Evidence &amp; Centrality Scoring
          </p>
          <span className="text-xs font-mono text-text-faint tracking-[-0.015em] tabular-nums">
            {entity.evidence?.length ?? 0} indicators detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-1">
          {entity.evidence && entity.evidence.length > 0 ? (
            entity.evidence.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-shell/50 border border-border-subtle/80"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <CheckCircle2
                    size={15}
                    className="text-accent shrink-0 mt-0.5"
                    strokeWidth={2}
                  />
                  <span className="text-xs text-text-primary leading-snug tracking-[-0.015em]">
                    {item.text || item}
                  </span>
                </div>

                {item.weight != null && (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-1.5 bg-shell rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${item.weight}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-text-faint w-7 text-right tabular-nums">
                      {item.weight}%
                    </span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs font-mono text-text-muted py-2">
              No critical anomaly indicators detected for this entity.
            </p>
          )}
        </div>
      </div>

      {/* 4. RELATED ENTITIES */}
      <div
        className="rounded-xl bg-surface p-5 border border-border flex flex-col gap-3"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
            Connected Entities &amp; Correlated Clusters
          </p>
          <span className="text-xs font-mono text-text-faint tracking-[-0.015em]">
            Click entity to investigate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
          {entity.related_entities && entity.related_entities.length > 0 ? (
            entity.related_entities.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectEntity(rel.id)}
                className="p-3.5 rounded-lg bg-shell/40 border border-border hover:border-accent/40 hover:bg-surface-hover transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-text-faint tracking-[-0.015em]">
                      {rel.type || "Wallet"}
                    </span>
                    <p className="font-mono font-semibold text-xs text-text-primary group-hover:text-accent transition-colors truncate max-w-[140px]">
                      {rel.id}
                    </p>
                  </div>
                  <RiskBadge score={rel.risk_score || 0} />
                </div>

                <div className="text-[11px] font-mono text-text-muted border-t border-border-subtle/80 pt-1.5 tracking-[-0.015em]">
                  {rel.role || "Direct Counterparty"}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs font-mono text-text-muted py-2 col-span-4">
              No external cluster connections found.
            </p>
          )}
        </div>
      </div>

      {/* 5. TRANSACTION TIMELINE */}
      <div
        className="rounded-xl bg-surface border border-border overflow-hidden"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
            Transaction Activity Timeline
          </p>
          <span className="text-xs font-mono text-text-faint tracking-[-0.015em] tabular-nums">
            {entity.transactions?.length ?? 0} recent transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/90 text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
                <th className="px-4 py-2.5 text-left">Timestamp (UTC)</th>
                <th className="px-4 py-2.5 text-left">Tx ID</th>
                <th className="px-4 py-2.5 text-left">Flow</th>
                <th className="px-4 py-2.5 text-left">Amount</th>
                <th className="px-4 py-2.5 text-left">Counterparty / Geo</th>
              </tr>
            </thead>
            <tbody>
              {entity.transactions && entity.transactions.length > 0 ? (
                entity.transactions.map((tx) => {
                  const isOut = tx.direction === "out";

                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-border-subtle last:border-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono text-text-muted tabular-nums tracking-[-0.015em]">
                        {tx.timestamp || "2026-08-20 14:00 UTC"}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-text-primary truncate max-w-[140px]">
                        {tx.id}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded tracking-[-0.015em] ${
                            isOut
                              ? "bg-slate-100 text-text-secondary"
                              : "bg-accent/10 text-accent"
                          }`}
                        >
                          {isOut ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownLeft size={12} />
                          )}
                          {isOut ? "OUTFLOW" : "INFLOW"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-text-primary font-bold tabular-nums">
                        {(tx.amount_btc || tx.amount || 0).toFixed(3)}{" "}
                        <span className="text-xs font-normal text-text-muted tracking-[-0.015em]">
                          BTC
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => tx.counterparty && onSelectEntity(tx.counterparty)}
                          className="font-mono text-xs text-text-muted hover:text-accent hover:underline cursor-pointer"
                        >
                          {tx.counterparty || tx.country || "Network Relay"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-text-muted">
                    No transactions recorded for this wallet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. LIVE INTERACTIVE GRAPH */}
      <div
        className="rounded-xl bg-surface p-5 border border-border flex flex-col gap-3"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
            Entity Forensic Graph
          </p>
          <span className="text-xs font-mono text-text-faint tracking-[-0.015em]">
            Multi-hop Subgraph Centered on {entity.id}
          </span>
        </div>

        <InvestigationGraph entityId={entity.id} />
      </div>
    </div>
  );
}

