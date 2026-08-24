import { RiskGauge } from "./RiskGauge";

export function TopFlaggedCard({ entity, onSelectEntity = () => {} }) {
  return (
    <div
      onClick={() => onSelectEntity(entity.id)}
      className="rounded-[9px] bg-surface p-4 flex flex-col gap-3 h-full border border-border cursor-pointer hover:border-accent/40 transition-all group"
      style={{
        boxShadow: "rgba(12, 41, 126, 0.04) 0px 0px 0px 1px inset",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
            Top flagged entity
          </p>
          <p className="mt-1 text-base font-semibold font-mono text-text-primary group-hover:text-accent transition-colors tracking-tight">
            {entity.id}
          </p>
        </div>
        <RiskGauge score={entity.risk_score} />
      </div>

      <div className="flex gap-6 border-t border-border-subtle pt-3">
        <div>
          <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
            Received
          </p>
          <p className="text-sm font-medium font-mono text-text-primary mt-0.5 tabular-nums">
            {entity.received_btc} <span className="text-xs text-text-muted font-normal tracking-[-0.015em]">BTC</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
            Sent
          </p>
          <p className="text-sm font-medium font-mono text-text-primary mt-0.5 tabular-nums">
            {entity.sent_btc} <span className="text-xs text-text-muted font-normal tracking-[-0.015em]">BTC</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-text-faint font-medium tracking-[-0.015em]">
            Hops (20 min)
          </p>
          <p className="text-sm font-medium font-mono text-accent mt-0.5 tabular-nums">
            {entity.hops_20min}
          </p>
        </div>
      </div>
    </div>
  );
}
