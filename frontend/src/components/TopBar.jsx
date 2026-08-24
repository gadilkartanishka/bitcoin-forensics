import { useState, useRef } from "react";
import { Search, UploadCloud, Loader2 } from "lucide-react";

export function TopBar({
  onSearch = () => {},
  onUploadDataset = () => {},
  totalWallets = 0,
}) {
  const [query, setQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onUploadDataset(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-6 shrink-0 bg-shell/70 backdrop-blur-[10px] [-webkit-backdrop-filter:blur(10px)] border-b border-border/40">
      {/* left: system status */}
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-text-primary">
          Bitcoin Forensic Analyzer
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-mono tracking-[-0.015em] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Connected · {totalWallets} Wallets
        </span>
      </div>

      {/* right: search + action */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint cursor-pointer hover:text-accent transition-colors"
            onClick={() => query.trim() && onSearch(query.trim())}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search wallet, tx id, or press Enter..."
            className="w-72 h-8 pl-8 pr-3 text-xs bg-bg border border-border rounded-[9px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-accent transition-colors font-mono"
          />
        </div>

        {/* Hidden file input for dataset uploads */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,.csv,.xml"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-8 px-4 text-xs font-medium text-white bg-accent hover:bg-accent/90 disabled:opacity-50 border border-accent rounded-[28.8px] transition-colors cursor-pointer flex items-center gap-1.5 tracking-[-0.015em] shadow-sm"
        >
          {isUploading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Ingesting...</span>
            </>
          ) : (
            <>
              <UploadCloud size={13} />
              <span>Analyze dataset</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

