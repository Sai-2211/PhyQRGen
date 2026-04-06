import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * QuantumProcess — showcases the full quantum entropy pipeline:
 *   Step 1 — Raw entropy bytes fetched from ANU QRNG API (measure of randomness)
 *   Step 2 — Derived quantum random number string (hex digest)
 *   Step 3 — QR code generated from the quantum random number
 *
 * Props:
 *   entropyBytes   — raw hex string returned by the QRNG API
 *   qrngSource     — 'quantum' | 'fallback'
 *   quantumNumber  — derived hex string (sessionId / entropy seed)
 *   qrPayload      — URL / data encoded into the QR code
 *   shortCode      — human-readable session code
 */
export default function QuantumProcess({
  entropyBytes = '',
  qrngSource = 'quantum',
  quantumNumber = '',
  qrPayload = '',
  shortCode = ''
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [revealed, setRevealed] = useState([false, false, false]);
  const timerRef = useRef(null);

  // Cascade step reveals with delays for a dramatic effect
  useEffect(() => {
    const delays = [0, 900, 1800];
    const timers = delays.map((delay, index) =>
      setTimeout(() => {
        setActiveStep(index);
        setRevealed((prev) => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [entropyBytes]);

  const isQuantum = qrngSource === 'quantum';

  // Truncate long hex for display
  const displayEntropy = entropyBytes
    ? `${entropyBytes.slice(0, 32)}…${entropyBytes.slice(-16)}`
    : '—';

  const displayQuantumNum = quantumNumber
    ? `${quantumNumber.slice(0, 24)}…`
    : '—';

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: `Join VaultChat Room — ${shortCode}`,
        text: `Join my quantum-encrypted ephemeral room (Code: ${shortCode})`,
        url: qrPayload
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(qrPayload).catch(() => {});
    }
  }

  function handleDownloadQR() {
    const svg = document.getElementById('quantum-qr-svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultchat-qr-${shortCode}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="quantum-process-panel w-full rounded-2xl overflow-hidden" style={{
      border: '1px solid rgba(0,212,255,0.3)',
      background: 'linear-gradient(160deg, rgba(0,10,20,0.97) 0%, rgba(5,18,30,0.95) 100%)',
      boxShadow: '0 0 48px rgba(0,212,255,0.08), 0 24px 64px rgba(0,0,0,0.55)'
    }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'rgba(0,212,255,0.15)' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1px solid rgba(0,212,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,212,255,0.08)',
          fontSize: 18
        }}>⚛</div>
        <div>
          <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#00d4ff', margin: 0 }}>
            Quantum Entropy Pipeline
          </p>
          <p style={{ fontSize: 12, color: '#7f9cab', margin: 0 }}>
            {isQuantum
              ? 'Live entropy from ANU Quantum Random Number Generator'
              : 'CSPRNG fallback entropy (ANU API unavailable)'}
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            padding: '3px 10px', borderRadius: 999,
            background: isQuantum ? 'rgba(0,255,136,0.15)' : 'rgba(255,200,0,0.15)',
            border: `1px solid ${isQuantum ? 'rgba(0,255,136,0.4)' : 'rgba(255,200,0,0.4)'}`,
            color: isQuantum ? '#00ff88' : '#ffc800'
          }}>
            {isQuantum ? '⚡ QUANTUM' : '⚙ FALLBACK'}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="p-5 flex flex-col gap-4">

        {/* Step 1 — Raw Entropy */}
        <StepCard
          step={1}
          title="Quantum Entropy Measurement"
          subtitle="Raw bytes fetched from ANU QRNG API — true quantum randomness from photon vacuum fluctuations"
          icon="🌌"
          active={revealed[0]}
          accentColor="#00d4ff"
        >
          <div style={{
            fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7,
            color: '#00d4ff', background: 'rgba(0,212,255,0.06)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 8, padding: '10px 14px',
            wordBreak: 'break-all', letterSpacing: '0.05em'
          }}>
            {entropyBytes
              ? chunked(entropyBytes.slice(0, 96), 8).map((chunk, i) => (
                  <span key={i} style={{ marginRight: 8, display: 'inline-block' }}>{chunk}</span>
                ))
              : '—'}
            {entropyBytes.length > 96 && <span style={{ color: '#7f9cab' }}> +{entropyBytes.length - 96} more chars</span>}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <Pill label="Entropy bits" value={`${entropyBytes.length * 4} bits`} />
            <Pill label="Hex chars" value={`${entropyBytes.length}`} />
            <Pill label="Source" value={isQuantum ? 'ANU QRNG API' : 'crypto.randomBytes'} />
          </div>
        </StepCard>

        {/* Arrow */}
        <StepArrow visible={revealed[1]} />

        {/* Step 2 — Quantum Random Number */}
        <StepCard
          step={2}
          title="Quantum Random Number"
          subtitle="Derived from entropy bytes — used as cryptographic session seed"
          icon="🔢"
          active={revealed[1]}
          accentColor="#00ff88"
        >
          <div style={{
            fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6,
            color: '#00ff88', background: 'rgba(0,255,136,0.06)',
            border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 8, padding: '10px 14px',
            wordBreak: 'break-all', letterSpacing: '0.08em', fontWeight: 600
          }}>
            {displayQuantumNum}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <Pill label="Format" value="Hex string" color="#00ff88" />
            <Pill label="Length" value={`${quantumNumber.length} chars`} color="#00ff88" />
            <Pill label="Derived via" value="SHA-256 of entropy" color="#00ff88" />
          </div>
        </StepCard>

        {/* Arrow */}
        <StepArrow visible={revealed[2]} color="#a855f7" />

        {/* Step 3 — QR Code */}
        <StepCard
          step={3}
          title="Quantum-Seeded QR Code"
          subtitle="QR code generated from the quantum random number — scan to join the encrypted room"
          icon="▦"
          active={revealed[2]}
          accentColor="#a855f7"
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
            {/* QR Code */}
            <div style={{
              background: '#fff', padding: 14, borderRadius: 12,
              boxShadow: '0 0 32px rgba(168,85,247,0.25)',
              border: '2px solid rgba(168,85,247,0.4)',
              flexShrink: 0
            }}>
              {qrPayload && (
                <QRCodeSVG
                  id="quantum-qr-svg"
                  value={qrPayload}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#0a0a0a"
                  level="M"
                />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <Pill label="Payload" value="Room invite URL" color="#a855f7" />
                <Pill label="Error correction" value="Level M (15%)" color="#a855f7" />
                <Pill label="Session Code" value={shortCode} color="#a855f7" />
              </div>

              <p style={{ fontSize: 11, color: '#7f9cab', marginBottom: 12, lineHeight: 1.6 }}>
                The QR code encodes the session URL seeded by quantum entropy.
                Anyone who scans it joins a cryptographically-authenticated ephemeral room.
              </p>

              {/* Share / Download Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleShare}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid rgba(168,85,247,0.5)',
                    background: 'rgba(168,85,247,0.12)',
                    color: '#c084fc', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(168,85,247,0.25)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(168,85,247,0.12)'}
                >
                  📤 Share Link
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1px solid rgba(0,212,255,0.4)',
                    background: 'rgba(0,212,255,0.08)',
                    color: '#00d4ff', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.08)'}
                >
                  ⬇ Download QR
                </button>
                <CopyButton text={qrPayload} />
              </div>
            </div>
          </div>
        </StepCard>
      </div>
    </div>
  );
}

/* ── Helper sub-components ── */

function StepCard({ step, title, subtitle, icon, active, accentColor = '#00d4ff', children }) {
  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${active ? accentColor + '45' : 'rgba(255,255,255,0.06)'}`,
      background: active ? `rgba(0,0,0,0.55)` : 'rgba(0,0,0,0.3)',
      padding: '14px 16px',
      transition: 'all 0.5s ease',
      opacity: active ? 1 : 0.35,
      transform: active ? 'translateY(0)' : 'translateY(6px)',
      boxShadow: active ? `0 0 24px ${accentColor}10` : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0
        }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.15em',
            padding: '2px 7px', borderRadius: 999,
            background: `${accentColor}22`, color: accentColor,
            border: `1px solid ${accentColor}40`
          }}>STEP {step}</span>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#ecf8ff' }}>{title}</p>
        </div>
        {active && (
          <span style={{ fontSize: 10, color: accentColor }}>✓</span>
        )}
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 11, color: '#7f9cab', lineHeight: 1.5 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function StepArrow({ visible, color = '#00d4ff' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      opacity: visible ? 1 : 0.1, transition: 'opacity 0.5s ease'
    }}>
      <div style={{ width: 1, height: 14, background: `${color}60` }} />
      <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
        <path d="M6 8L0.803848 0.5L11.1962 0.5L6 8Z" fill={color} fillOpacity={0.7} />
      </svg>
    </div>
  );
}

function Pill({ label, value, color = '#00d4ff' }) {
  return (
    <span style={{
      display: 'inline-flex', flexDirection: 'column',
      padding: '4px 10px', borderRadius: 8,
      background: `${color}10`,
      border: `1px solid ${color}25`
    }}>
      <span style={{ fontSize: 9, color: '#7f9cab', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 11, color, fontWeight: 600, fontFamily: 'monospace' }}>{value}</span>
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: '1px solid rgba(0,255,136,0.4)',
        background: 'rgba(0,255,136,0.08)',
        color: '#00ff88', cursor: 'pointer', transition: 'all 0.2s'
      }}
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,255,136,0.2)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,255,136,0.08)'}
    >
      {copied ? '✓ Copied!' : '⎘ Copy Link'}
    </button>
  );
}

function chunked(str, size) {
  const chunks = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}
