import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";

export function VolumeChart({ data }) {
  const anomalyMonth = "Apr";
  const accent = "#3368A0";

  return (
    <div
      className="rounded-xl border border-border bg-surface p-4"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <p className="text-[11px] font-medium uppercase text-text-muted mb-3 tracking-[-0.015em]">
        Volume over time — flagged point highlighted
      </p>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E2E8F0"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "#64748B", fontSize: 11, fontFamily: "ui-monospace, monospace" }}
            axisLine={{ stroke: "#D8E1EC" }}
            tickLine={false}
            interval={0}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis hide />
          <ReferenceLine
            x={anomalyMonth}
            stroke="#94A3B8"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={accent}
            strokeWidth={2}
            dot={false}
          />
          <ReferenceDot
            x={anomalyMonth}
            y={89}
            r={4.5}
            fill={accent}
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      <p className="mt-1 text-xs text-center font-mono tracking-[-0.015em]">
        <span className="text-accent font-semibold">Apr — spike</span>
      </p>
    </div>
  );
}
