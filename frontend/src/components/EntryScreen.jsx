import { useState, useEffect } from "react";
import { ShieldCheck, Check, Loader2 } from "lucide-react";

const PIPELINE_STEPS = [
  "Parsing dataset...",
  "Correlating IP, wallet & transaction data...",
  "Engineering wallet features...",
  "Scoring anomalies...",
];

export function EntryScreen({ onLoadDataset }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isProcessing) return;

    if (activeStep < PIPELINE_STEPS.length) {
      const stepTimer = setTimeout(() => {
        setActiveStep((prev) => prev + 1);
      }, 700);
      return () => clearTimeout(stepTimer);
    }

    // When all steps are finished (activeStep === PIPELINE_STEPS.length)
    const completionTimer = setTimeout(() => {
      onLoadDataset();
    }, 500);
    return () => clearTimeout(completionTimer);
  }, [isProcessing, activeStep, onLoadDataset]);

  const handleStartAnalysis = () => {
    setIsProcessing(true);
    setActiveStep(0);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-bg flex items-center justify-center px-6 select-none">
      {/* Centered system briefing card */}
      <div className="w-full max-w-md flex flex-col items-center text-center -translate-y-3 sm:-translate-y-5">
        {/* Refined Shield mark in product accent */}
        <div className="w-12 h-12 rounded-full border border-accent/25 bg-accent/5 flex items-center justify-center text-accent mb-5">
          <ShieldCheck size={24} strokeWidth={2} />
        </div>

        {/* Clinical system header */}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-text-primary">
          Bitcoin Forensic Analyzer
        </h1>

        {/* Factual description */}
        <p className="mt-1.5 text-sm text-text-muted font-normal">
          Offline transaction &amp; network analysis platform
        </p>

        {!isProcessing ? (
          <>
            {/* System status block */}
            <div
              className="mt-6 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-shell text-xs font-mono text-text-muted"
              style={{
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.02), inset 0 1px 0 0 rgba(255,255,255,0.7)",
              }}
            >
              <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
              <span>Offline</span>
              <span className="text-text-faint">·</span>
              <span>
                Dataset:{" "}
                <span className="text-text-primary font-medium">
                  synthetic_v1.json
                </span>
              </span>
              <span className="text-text-faint">·</span>
              <span className="text-text-faint">Last sync: --</span>
            </div>

            {/* Primary Action Button */}
            <div className="mt-7">
              <button
                type="button"
                id="analyze-dataset-btn"
                onClick={handleStartAnalysis}
                className="h-10 px-6 bg-accent text-white text-sm font-medium rounded-xl hover:bg-accent/90 active:scale-[0.99] transition-all cursor-pointer inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                Analyze dataset
              </button>
            </div>
          </>
        ) : (
          /* Sequential Processing Pipeline State */
          <div className="mt-7 w-full max-w-sm flex flex-col items-center">
            {/* Minimal Progress Bar */}
            <div className="w-full h-1 bg-shell rounded-full overflow-hidden mb-4">
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
            <div className="w-full bg-shell/70 rounded-xl p-3.5 flex flex-col gap-2 text-left font-mono text-xs">
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
                        : "text-text-faint opacity-50"
                    }`}
                  >
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      {isCompleted ? (
                        <Check size={14} className="text-accent" strokeWidth={2.5} />
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

      {/* Low-contrast clinical demo footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-[11px] font-mono text-text-faint tracking-wide">
        Prototype build — Smart India Hackathon 2026
      </footer>
    </main>
  );
}
