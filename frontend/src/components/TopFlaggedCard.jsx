import { RiskGauge } from "./RiskGauge";

export function TopFlaggedCard({ entity, onSelectEntity = () => {} }) {
  return (
    <div
      onClick={() => onSelectEntity(entity.id)}
      className="rounded-xl bg-surface p-4 flex flex-col gap-3 h-full border border-border cursor-pointer hover:border-accent/40 transition-all group"
      style={{
        boxShadow:
          "0 2px 4px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 0 rgba(255,255,255,0.9)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Top flagged entity
          </p>
          <p className="mt-1 text-lg font-bold font-mono text-text-primary group-hover:text-accent transition-colors tracking-tight">
            {entity.id}
          </p>
        </div>
        <RiskGauge score={entity.risk_score} />
      </div>

      <div className="flex gap-6 border-t border-border-subtle pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
            Received
          </p>
          <p className="text-sm font-bold font-mono text-text-primary mt-0.5">
            {entity.received_btc} <span className="text-xs text-text-muted font-normal">BTC</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
            Sent
          </p>
          <p className="text-sm font-bold font-mono text-text-primary mt-0.5">
            {entity.sent_btc} <span className="text-xs text-text-muted font-normal">BTC</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-faint font-medium">
            Hops (20 min)
          </p>
          <p className="text-sm font-bold font-mono text-accent mt-0.5">
            {entity.hops_20min}
          </p>
        </div>
      </div>
    </div>
  );
}
