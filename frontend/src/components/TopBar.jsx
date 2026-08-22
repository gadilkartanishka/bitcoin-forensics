import { Search, RefreshCw } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 shrink-0 bg-shell/70 backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)]">
      {/* left: system status */}
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-text-primary">
          Bitcoin forensic analyzer
        </span>
        <span className="text-xs text-text-faint">
          Offline · Dataset: synthetic_v1.json
        </span>
      </div>

      {/* right: search + action */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint"
          />
          <input
            type="text"
            placeholder="Search wallet, tx id, IP..."
            className="w-64 h-8 pl-8 pr-3 text-xs bg-bg border border-border rounded-lg text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent"
          />
        </div>

        <button className="h-8 px-3 text-xs text-text-muted border border-border rounded-lg hover:text-text-primary hover:border-text-faint cursor-pointer flex items-center gap-1.5">
          <RefreshCw size={12} />
          Load dataset
        </button>
      </div>
    </header>
  );
}
