import { ArrowLeft, CheckCircle2, Waypoints, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { RiskGauge } from "./RiskGauge";

function RiskBadge({ score }) {
  if (score >= 90) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-bold font-mono rounded bg-accent text-white tracking-tight">
        {score}%
      </span>
    );
  }
  if (score >= 70) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-semibold font-mono rounded border border-accent/50 text-accent bg-accent/10">
        {score}%
      </span>
    );
  }
  return (
    <span className="text-text-faint font-mono text-xs px-2 py-0.5">
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to {previousViewTitle}</span>
        </button>
        <span className="text-xs font-mono text-text-faint">
          Investigation ID: {entity.id}
        </span>
      </div>

      {/* 1. HEADER HERO CARD with STATS ROW */}
      <div
        className="rounded-xl bg-surface p-5 border border-border flex flex-col gap-5"
        style={{
          boxShadow:
            "0 2px 4px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 0 rgba(255,255,255,0.9)",
        }}
      >
        {/* Header Title & Risk Score */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Entity Investigation
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-shell text-text-secondary">
                {entity.type}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-text-primary tracking-tight">
              {entity.id}
            </h1>
            <p className="text-xs font-mono text-text-faint mt-1 break-all">
              {entity.fullId}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Risk Score
              </p>
              <p className="text-xs font-mono text-accent font-medium">
                High Anomaly Rating
              </p>
            </div>
            <RiskGauge score={entity.risk_score} />
          </div>
        </div>

        {/* 2. STATS ROW (Internal Divider Pattern) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 border-t border-border-subtle pt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
              Transactions
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5">
              {entity.stats?.transactions != null
                ? entity.stats.transactions.toLocaleString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
              Received
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5">
              {entity.stats?.received_btc != null ? entity.stats.received_btc : "—"}{" "}
              <span className="text-xs text-text-muted font-normal">BTC</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
              Sent
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5">
              {entity.stats?.sent_btc != null ? entity.stats.sent_btc : "—"}{" "}
              <span className="text-xs text-text-muted font-normal">BTC</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
              Unique IPs
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5">
              {entity.stats?.unique_ips ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
              Countries
            </p>
            <p className="text-base font-bold font-mono text-text-primary mt-0.5">
              {entity.stats?.countries ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
              Hops (20 min)
            </p>
            <p className="text-base font-bold font-mono text-accent mt-0.5">
              {entity.stats?.hops_20min ?? "—"}
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
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Why flagged — Anomaly Evidence &amp; Centrality Scoring
          </p>
          <span className="text-xs font-mono text-text-faint">
            {entity.evidence?.length ?? 0} indicators detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-1">
          {entity.evidence?.map((item, idx) => (
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
                <span className="text-xs text-text-primary leading-snug">
                  {item.text}
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
                  <span className="text-[10px] font-mono text-text-faint w-7 text-right">
                    {item.weight}%
                  </span>
                </div>
              )}
            </div>
          ))}
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
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Connected Entities &amp; Correlated Clusters
          </p>
          <span className="text-xs font-mono text-text-faint">
            Click entity to investigate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
          {entity.related_entities?.map((rel) => (
            <div
              key={rel.id}
              onClick={() => onSelectEntity(rel.id)}
              className="p-3.5 rounded-lg bg-shell/40 border border-border hover:border-accent/40 hover:bg-surface-hover transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-faint">
                    {rel.type}
                  </span>
                  <p className="font-mono font-semibold text-xs text-text-primary group-hover:text-accent transition-colors">
                    {rel.id}
                  </p>
                </div>
                <RiskBadge score={rel.risk_score} />
              </div>

              <div className="text-[11px] font-mono text-text-muted border-t border-border-subtle/80 pt-1.5">
                {rel.role}
              </div>
            </div>
          ))}
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
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Transaction Activity Timeline
          </p>
          <span className="text-xs font-mono text-text-faint">
            {entity.transactions?.length ?? 0} recent transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/90 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2.5 text-left">Timestamp (UTC)</th>
                <th className="px-4 py-2.5 text-left">Tx ID</th>
                <th className="px-4 py-2.5 text-left">Flow</th>
                <th className="px-4 py-2.5 text-left">Amount</th>
                <th className="px-4 py-2.5 text-left">Counterparty</th>
              </tr>
            </thead>
            <tbody>
              {entity.transactions?.map((tx) => {
                const isOut = tx.direction === "out";

                return (
                  <tr
                    key={tx.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-text-muted tabular-nums">
                      {tx.timestamp}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-text-primary">
                      {tx.id}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-semibold rounded ${
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
                      {tx.amount_btc.toFixed(3)}{" "}
                      <span className="text-xs font-normal text-text-muted">
                        BTC
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => onSelectEntity(tx.counterparty)}
                        className="font-mono text-xs text-text-muted hover:text-accent hover:underline cursor-pointer"
                      >
                        {tx.counterparty}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. RESERVED GRAPH SLOT */}
      <div
        className="rounded-xl bg-surface p-5 border border-border flex flex-col gap-3"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Entity Graph
          </p>
          <span className="text-xs font-mono text-text-faint">
            Multi-hop Topology
          </span>
        </div>

        {/* 420px dashed placeholder container */}
        <div className="w-full h-[420px] rounded-xl border-2 border-dashed border-border bg-shell/30 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-shell/80 border border-border flex items-center justify-center text-text-muted mb-3">
            <Waypoints size={24} strokeWidth={1.8} />
          </div>
          <p className="text-sm font-medium text-text-secondary">
            Graph visualization — pending integration
          </p>
          <p className="text-xs font-mono text-text-faint mt-1 max-w-sm">
            Interactive multi-hop network cluster analysis and community detection
          </p>
        </div>
      </div>
    </div>
  );
}
