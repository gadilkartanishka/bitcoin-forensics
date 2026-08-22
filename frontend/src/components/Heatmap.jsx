const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// High-precision intelligence blue scaling on dimensional base
const cellColor = (level) => {
  switch (level) {
    case 0:
      return "bg-[#EDF2F7] border border-slate-200/50";
    case 1:
      return "bg-accent/15 border border-accent/20";
    case 2:
      return "bg-accent/35 border border-accent/30";
    case 3:
      return "bg-accent/55 border border-accent/40";
    case 4:
      return "bg-accent/80 border border-accent/50";
    case 5:
      return "bg-accent border border-accent";
    default:
      return "bg-[#EDF2F7]";
  }
};

export function Heatmap({ data }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-4"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-3">
        Transaction frequency (Wallet A)
      </p>

      <div
        className="inline-grid gap-1.5"
        style={{ gridTemplateColumns: `auto repeat(7, 1fr)` }}
      >
        {/* header row */}
        <div /> {/* empty corner */}
        {days.map((d) => (
          <span
            key={d}
            className="text-[10px] font-mono text-text-faint text-center w-8"
          >
            {d}
          </span>
        ))}

        {/* data rows */}
        {data.map((row) => (
          <div key={`row-${row.label}`} className="contents">
            <span className="text-[10px] font-mono text-text-faint pr-2 flex items-center">
              {row.label}
            </span>
            {row.values.map((v, ci) => (
              <div
                key={`${row.label}-${ci}`}
                className={`w-8 h-6 rounded ${cellColor(v)} transition-colors`}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] font-mono text-text-muted">
        Cluster of activity 11am–1pm, Tue–Fri — feeds anomaly score
      </p>
    </div>
  );
}
