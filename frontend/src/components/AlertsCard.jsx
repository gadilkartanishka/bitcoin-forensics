export function AlertsCard({ count, trend }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between h-full"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
        Alerts open
      </p>
      <p className="mt-1 text-3xl font-bold font-mono text-text-primary tracking-tight">
        {count.toLocaleString()}
      </p>
      <p className="mt-2 text-xs font-mono text-accent font-medium">
        ↑ {trend}% vs last batch
      </p>
    </div>
  );
}
