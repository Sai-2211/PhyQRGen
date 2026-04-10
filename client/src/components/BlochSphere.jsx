import { useId } from 'react';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function BlochSphere({
  entropyMeasure = 0,
  vectorLength,
  azimuth,
  polar,
  label = 'Quantum state'
}) {
  const id = useId().replace(/:/g, '');
  const normalizedEntropy = clamp(Number(entropyMeasure) || 0, 0, 1);
  const sphereRadius = 82;
  const effectiveVectorLength = clamp(
    Number(vectorLength ?? 0.9 - normalizedEntropy * 0.72) || 0.9,
    0.16,
    1
  );
  const cx = 110;
  const cy = 110;
  const theta = clamp(Number(polar) || Math.PI / 3.2, Math.PI * 0.12, Math.PI * 0.88);
  const phi = Number(azimuth) || Math.PI / 5;

  const x = cx + sphereRadius * effectiveVectorLength * Math.sin(theta) * Math.cos(phi);
  const y =
    cy -
    sphereRadius *
      effectiveVectorLength *
      (Math.cos(theta) * 0.82 + Math.sin(theta) * Math.sin(phi) * 0.18);
  const shadowX = cx + (x - cx) * 0.72;
  const shadowY = cy + (y - cy) * 0.2 + 14;

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
        <svg viewBox="0 0 220 220" className="h-auto w-full max-w-[260px]">
          <defs>
            <radialGradient id={`sphereFill-${id}`} cx="35%" cy="30%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#eef3ff" />
              <stop offset="100%" stopColor="#d6e4ff" />
            </radialGradient>
            <linearGradient id={`vectorStroke-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0a84ff" />
              <stop offset="100%" stopColor="#7dd3fc" />
            </linearGradient>
            <radialGradient id={`stateGlow-${id}`} cx="50%" cy="50%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0a84ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse cx={cx} cy={cy + 6} rx={sphereRadius} ry={26} fill="#edf3fb" />

          <g opacity="0.7">
            <ellipse cx={cx} cy={cy} rx={sphereRadius} ry={26} fill="none" stroke="#d8e3f3" strokeWidth="1.2">
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from={`0 ${cx} ${cy}`}
                to={`360 ${cx} ${cy}`}
                dur="16s"
                repeatCount="indefinite"
              />
            </ellipse>
            <ellipse cx={cx} cy={cy} rx={28} ry={sphereRadius} fill="none" stroke="#dfe8f5" strokeWidth="1.2">
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from={`360 ${cx} ${cy}`}
                to={`0 ${cx} ${cy}`}
                dur="12s"
                repeatCount="indefinite"
              />
            </ellipse>
          </g>

          <circle
            cx={cx}
            cy={cy}
            r={sphereRadius}
            fill={`url(#sphereFill-${id})`}
            stroke="#c9d5ea"
            strokeWidth="1.5"
          />
          <ellipse cx={cx} cy={cy} rx={sphereRadius} ry={26} fill="none" stroke="#bfd0e8" strokeWidth="1.5" />
          <line x1={cx} y1={cy - sphereRadius - 12} x2={cx} y2={cy + sphereRadius + 12} stroke="#d5dfef" strokeWidth="1.5" />
          <line x1={cx - sphereRadius - 12} y1={cy} x2={cx + sphereRadius + 12} y2={cy} stroke="#e1e8f5" strokeWidth="1.5" />

          <circle cx={shadowX} cy={shadowY} r="10" fill="#dbeafe" opacity="0.65">
            <animate attributeName="r" values="8;12;8" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.8s" repeatCount="indefinite" />
          </circle>

          <line
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={`url(#vectorStroke-${id})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="5 6"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="-22" dur="1.6s" repeatCount="indefinite" />
          </line>
          <line x1={cx} y1={cy} x2={x} y2={y} stroke="#0a84ff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
          <circle cx={x} cy={y} r="14" fill={`url(#stateGlow-${id})`} opacity="0.42">
            <animate attributeName="r" values="12;17;12" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.22;0.48;0.22" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={x} cy={y} r="7.5" fill="#0a84ff">
            <animate attributeName="r" values="7.2;8.2;7.2" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={x} cy={y} r="3.2" fill="#ffffff" />
          <circle cx={cx} cy={cy} r="5" fill="#94a8c8" />

          <text x={cx + sphereRadius + 6} y={cy + 4} fontSize="10" fill="#94a3b8">
            x
          </text>
          <text x={cx - 6} y={cy - sphereRadius - 18} fontSize="10" fill="#94a3b8">
            z
          </text>
        </svg>
      </div>

      <p className="mt-4 text-sm leading-6 text-vault-muted">
        The animated state marker pulses at the current Bloch coordinate, while the vector length contracts as the
        sampled entropy approaches a more mixed effective state.
      </p>
    </div>
  );
}
