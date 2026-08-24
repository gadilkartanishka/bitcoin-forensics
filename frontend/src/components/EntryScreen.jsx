import { useState, useEffect, useRef } from "react";
import { ShieldCheck, Check, Loader2, UploadCloud, FileText, ArrowRight, Sparkles } from "lucide-react";

const PIPELINE_STEPS = [
  "Parsing raw transaction feed (UTXO schema)...",
  "Constructing bipartite graph & community clusters...",
  "Engineering topological features & PageRank...",
  "Running Isolation Forest ML anomaly scoring...",
  "Generating prioritized security alerts...",
];

export function EntryScreen({ onStartAnalysis }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isProcessing) return;

    if (activeStep < PIPELINE_STEPS.length) {
      const stepTimer = setTimeout(() => {
        setActiveStep((prev) => prev + 1);
      }, 600);
      return () => clearTimeout(stepTimer);
    }

    // When all steps are finished
    const completionTimer = setTimeout(() => {
      onStartAnalysis(selectedFile);
    }, 400);
    return () => clearTimeout(completionTimer);
  }, [isProcessing, activeStep, onStartAnalysis, selectedFile]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg("");

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e) => {
    setErrorMsg("");
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".json") || name.endsWith(".csv") || name.endsWith(".xml")) {
      setSelectedFile(file);
    } else {
      setErrorMsg("Please upload a valid JSON, CSV, or XML file.");
    }
  };

  const handleStartAnalysis = () => {
    setIsProcessing(true);
    setActiveStep(0);
  };

  const handleContinueWithSample = () => {
    setSelectedFile(null);
    setIsProcessing(true);
    setActiveStep(0);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <main className="relative min-h-screen w-screen overflow-y-auto bg-bg flex items-center justify-center p-6 select-none">
      {/* Background ambient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Main Container Card (9px radius from design.md) */}
      <div className="relative w-full max-w-lg flex flex-col items-center text-center bg-surface border border-border rounded-[9px] p-8 sm:p-10 shadow-sm">
        {/* Bitcoin Symbol Icon in Deep Blue */}
        <svg className="w-12 h-12 mb-5" viewBox="0 0 512 512.001" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" fill="#3368A0" d="M256 0c141.385 0 256 114.615 256 256 0 141.386-114.615 256.001-256 256.001S0 397.386 0 256C0 114.615 114.615 0 256 0zm84.612 201.62c-3.88-31.345-29.619-40.265-62.659-42.711l-.517-27.705-25.587.077 1.033 26.815-20.994.354-.33-27.003-26.29.266 1.41 28.22-16.4.628-35.288.417 1.158 26.805 17.994-.304c10.59.175 14.582 6.637 14.495 11.934 1.162 41.42 1.777 70.56 2.62 113.775-.464 3.892-2.146 8.86-9.739 8.637l-17.994.302-4.602 30.607 50.985-.858 1.596 28.923 24.696-.592-.518-27.707 19.399-.679 1.222 27.518 25.587-.077-.706-28.41c42.828-3.191 72.804-14.988 75.663-54.919 1.929-32.15-13.13-46.189-37.927-51.596 14.518-7.655 23.639-21.398 21.693-42.717zm-33.774 90.39c-.008 30.881-53.854 29.493-71.146 29.608l-.77-56.279c17.291-.115 71.363-6.318 71.916 26.671zm-14.386-78.993c1.018 29.102-43.315 26.671-58.312 26.922l-.858-50.983c14.997-.253 59.556-5.415 59.17 24.061zM256.002 48.49c114.604 0 207.51 92.906 207.51 207.513 0 114.604-92.906 207.509-207.51 207.509-114.606 0-207.512-92.905-207.512-207.509 0-114.607 92.906-207.513 207.512-207.513z"/>
        </svg>

        <h1 className="text-3xl font-display-serif font-medium tracking-tight text-text-primary">
          Bitcoin Forensic Analyzer
        </h1>
        <p className="mt-2 text-xs text-text-muted font-normal max-w-sm tracking-[-0.01em]">
          Autonomous blockchain forensic intelligence &amp; money-laundering detection pipeline
        </p>

        {!isProcessing ? (
          <div className="w-full mt-6 flex flex-col gap-4">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-6 rounded-[9px] border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 ${
                isDragging
                  ? "border-accent bg-accent/5 scale-[1.01]"
                  : selectedFile
                  ? "border-accent/60 bg-accent/[0.02]"
                  : "border-border-subtle hover:border-accent/40 bg-shell/40 hover:bg-shell/70"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json,.csv,.xml"
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-[9px] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-semibold text-text-primary max-w-xs truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] font-mono text-text-muted mt-0.5">
                      {formatFileSize(selectedFile.size)} · Ready to ingest
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-accent hover:underline mt-1">
                    Click to change file
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-shell border border-border flex items-center justify-center text-text-muted">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">
                      Drop your dataset file here, or <span className="text-accent underline">browse</span>
                    </p>
                    <p className="text-[11px] font-mono text-text-faint mt-1">
                      Supports .CSV, .JSON, and .XML feeds
                    </p>
                  </div>
                </>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-red-500 bg-red-500/10 border border-red-500/20 py-1.5 px-3 rounded-[9px]">
                {errorMsg}
              </p>
            )}

            {/* Primary Action Button (28.8px Pill from design.md) */}
            <button
              type="button"
              id="analyze-dataset-btn"
              onClick={handleStartAnalysis}
              className="w-full h-11 bg-accent text-white text-xs font-medium rounded-[28.8px] hover:bg-accent/90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{selectedFile ? "Ingest & Analyze Uploaded Dataset" : "Ingest & Analyze Dataset"}</span>
              <ArrowRight size={14} />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-[10px] font-mono uppercase text-text-faint">or</span>
              <div className="flex-1 h-px bg-border-subtle" />
            </div>

            {/* Bypass to sample dataset (Clean text, no icon) */}
            <button
              type="button"
              onClick={handleContinueWithSample}
              className="w-full h-10 bg-shell hover:bg-shell/80 border border-border text-text-secondary hover:text-text-primary text-xs font-medium rounded-[28.8px] transition-colors cursor-pointer flex items-center justify-center"
            >
              <span>Explore Preloaded Forensic Dataset</span>
            </button>
          </div>
        ) : (
          /* Sequential Processing Pipeline State */
          <div className="mt-6 w-full flex flex-col items-center">
            {/* Minimal Progress Bar */}
            <div className="w-full h-1.5 bg-shell rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-accent transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      ((activeStep + 0.5) / PIPELINE_STEPS.length) * 100
                    )
                  )}%`,
                }}
              />
            </div>

            {/* Steps list in monospace */}
            <div className="w-full bg-shell/80 border border-border-subtle rounded-[9px] p-4 flex flex-col gap-2.5 text-left font-mono text-xs shadow-inner">
              {PIPELINE_STEPS.map((step, idx) => {
                const isCompleted = idx < activeStep;
                const isCurrent = idx === activeStep;

                return (
                  <div
                    key={step}
                    className={`flex items-center gap-2.5 transition-all duration-300 ${
                      isCompleted
                        ? "text-text-primary font-medium"
                        : isCurrent
                        ? "text-accent font-semibold"
                        : "text-text-faint opacity-40"
                    }`}
                  >
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      {isCompleted ? (
                        <Check size={14} className="text-emerald-600" strokeWidth={2.5} />
                      ) : isCurrent ? (
                        <Loader2
                          size={13}
                          className="text-accent animate-spin"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-text-faint/40" />
                      )}
                    </div>
                    <span className="truncate">{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
