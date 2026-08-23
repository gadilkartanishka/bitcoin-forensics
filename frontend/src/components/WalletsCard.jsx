export function WalletsCard({ wallets, transactions }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between h-full"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <p className="text-[11px] font-medium uppercase text-text-muted tracking-[-0.015em]">
        Wallets scanned
      </p>
      <p className="mt-1 text-3xl font-bold font-mono text-text-primary tracking-tight tabular-nums">
        {wallets.toLocaleString()}
      </p>
      <p className="mt-2 text-xs font-mono text-text-muted tabular-nums tracking-[-0.015em]">
        {transactions.toLocaleString()} transactions
      </p>
    </div>
  );
}
