function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function BlochSphere({ entropyMeasure = 0, label = 'Quantum state' }) {
  const normalizedEntropy = clamp(Number(entropyMeasure) || 0, 0, 1);
  const vectorLength = 0.9 - normalizedEntropy * 0.72;
  const radius = 78;
  const cx = 110;
  const cy = 110;
  const theta = Math.PI / 3.3;
  const phi = Math.PI / 5;

  const x =
    cx + radius * vectorLength * Math.sin(theta) * Math.cos(phi);
  const y =
    cy - radius * vectorLength * (Math.cos(theta) * 0.82 + Math.sin(theta) * Math.sin(phi) * 0.18);

  return (
    <div className="rounded-[30px] border border-vault-border bg-white p-5 shadow-vault-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Bloch sphere</p>
          <p className="mt-2 text-lg font-semibold text-vault-text">{label}</p>
        </div>
        <div className="w-fit rounded-full bg-vault-surface px-3 py-1 text-xs font-medium text-vault-muted">
          entropy {normalizedEntropy.toFixed(2)}
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        <svg viewBox="0 0 220 220" className="h-auto w-full max-w-[240px]">
          <defs>
            <radialGradient id="sphereFill" cx="35%" cy="30%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#eef3ff" />
              <stop offset="100%" stopColor="#d6e4ff" />
            </radialGradient>
            <linearGradient id="vectorStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a84ff" />
              <stop offset="100%" stopColor="#6ea8ff" />
            </linearGradient>
          </defs>

          <ellipse cx={cx} cy={cy + 3} rx={radius} ry={28} fill="#eff3fa" />
          <circle cx={cx} cy={cy} r={radius} fill="url(#sphereFill)" stroke="#c9d5ea" strokeWidth="1.5" />
          <ellipse cx={cx} cy={cy} rx={radius} ry={28} fill="none" stroke="#bfd0e8" strokeWidth="1.5" />
          <ellipse cx={cx} cy={cy} rx={28} ry={radius} fill="none" stroke="#e1e8f5" strokeWidth="1.5" />
          <line x1={cx} y1={cy - radius - 12} x2={cx} y2={cy + radius + 12} stroke="#d5dfef" strokeWidth="1.5" />
          <line x1={cx - radius - 12} y1={cy} x2={cx + radius + 12} y2={cy} stroke="#e1e8f5" strokeWidth="1.5" />

          <line x1={cx} y1={cy} x2={x} y2={y} stroke="url(#vectorStroke)" strokeWidth="4" strokeLinecap="round" />
          <circle cx={x} cy={y} r="7.5" fill="#0a84ff" />
          <circle cx={cx} cy={cy} r="5" fill="#94a8c8" />
        </svg>
      </div>

      <p className="mt-4 text-sm leading-6 text-vault-muted">
        Higher entropy shortens the Bloch vector to suggest a more mixed quantum state, while lower entropy keeps it closer to the sphere boundary.
      </p>
    </div>
  );
}
