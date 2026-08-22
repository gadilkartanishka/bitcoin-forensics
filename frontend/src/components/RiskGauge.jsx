export function RiskGauge({ score }) {
  const radius = 30;
  const stroke = 5;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;

  const strokeColor = "#2563EB";
  const trackColor = "#E2E8F0";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="72" height="72" viewBox="0 0 72 72">
        {/* background ring */}
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {/* filled ring */}
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeDasharray={`${filled} ${gap}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <span className="absolute text-sm font-bold font-mono text-text-primary tracking-tight">
        {score}%
      </span>
    </div>
  );
}
