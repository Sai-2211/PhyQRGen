import { useMemo, useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const presetDurations = [
  { label: '15 min', value: 15 * 60 },
  { label: '30 min', value: 30 * 60 },
  { label: '1 hr', value: 60 * 60 },
  { label: '2 hr', value: 2 * 60 * 60 },
  { label: '4 hr', value: 4 * 60 * 60 },
  { label: 'Custom', value: 'custom' }
];

export default function CreateSession({ onCreated }) {
  const [nickname, setNickname] = useState('');
  const [durationChoice, setDurationChoice] = useState(30 * 60);
  const [customHours, setCustomHours] = useState(1);
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const resolvedDuration = useMemo(() => {
    if (durationChoice === 'custom') {
      return Math.min(24 * 60 * 60, Math.max(15 * 60, Number(customHours || 1) * 60 * 60));
    }

    return Number(durationChoice);
  }, [durationChoice, customHours]);

  async function handleCreate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        duration: resolvedDuration,
        maxParticipants: Number(maxParticipants)
      };

      if (passcode) {
        payload.passcode = passcode;
      }

      const response = await axios.post(`${SERVER_URL}/api/session/create`, payload);
      const next = {
        ...response.data,
        displayName: nickname || 'Creator',
        passcode: passcode || ''
      };

      setResult(next);
      onCreated?.(next);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || 'Unable to create session');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <section className="vault-panel relative overflow-hidden rounded-2xl p-6 md:p-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 grid-pulse animate-pulseGrid" />
          <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent to-transparent border-t border-vault-accent/25 animate-scanline" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-5">
          <p className="text-xs uppercase tracking-[0.25em] text-vault-accent">Session Created</p>
          <div className="rounded-2xl bg-white p-4 md:p-6">
            <QRCodeSVG value={result.qrPayload} size={280} bgColor="#ffffff" fgColor="#0a0a0a" />
          </div>
          <p className="text-sm text-vault-muted text-center">Scan to join this encrypted room</p>

          <div className="w-full rounded-xl border border-vault-accent/30 bg-vault-panel2/70 p-4">
            <p className="text-xs text-vault-muted">Session Code</p>
            <p className="mt-1 text-lg font-semibold tracking-[0.2em] text-vault-accentAlt">{result.shortCode}</p>
            <p className="mt-2 text-xs text-vault-muted">Session ID: {result.sessionId}</p>
            <p className="mt-2 text-xs text-vault-muted">Expires at: {new Date(result.expiresAt).toLocaleString()}</p>
            <p className="mt-2 text-xs text-vault-accent">QRNG {'⚛'} {result.qrngSource === 'quantum' ? 'quantum entropy' : 'fallback entropy'}</p>
          </div>

          <p className="text-sm text-vault-muted">Waiting for participants...</p>
        </div>
      </section>
    );
  }

  return (
    <form className="vault-panel rounded-2xl p-6 md:p-8" onSubmit={handleCreate}>
      <h2 className="text-lg font-semibold text-vault-text">Create Secure Session</h2>
      <p className="mt-1 text-sm text-vault-muted">Create a room and share the QR invite.</p>

      <label className="mt-6 block text-sm text-vault-muted">
        Nickname (optional)
        <input
          className="mt-2 w-full rounded-lg border border-vault-accent/30 bg-vault-panel2 px-3 py-2 text-vault-text outline-none focus:border-vault-accent"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={40}
          placeholder="CipherFox"
        />
      </label>

      <label className="mt-4 block text-sm text-vault-muted">
        Duration
        <select
          className="mt-2 w-full rounded-lg border border-vault-accent/30 bg-vault-panel2 px-3 py-2 text-vault-text outline-none focus:border-vault-accent"
          value={durationChoice}
          onChange={(event) => {
            const value = event.target.value;
            setDurationChoice(value === 'custom' ? 'custom' : Number(value));
          }}
        >
          {presetDurations.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {durationChoice === 'custom' ? (
        <label className="mt-4 block text-sm text-vault-muted">
          Custom duration (hours, max 24)
          <input
            type="number"
            min={1}
            max={24}
            className="mt-2 w-full rounded-lg border border-vault-accent/30 bg-vault-panel2 px-3 py-2 text-vault-text outline-none focus:border-vault-accent"
            value={customHours}
            onChange={(event) => setCustomHours(event.target.value)}
          />
        </label>
      ) : null}

      <label className="mt-4 block text-sm text-vault-muted">
        Max participants (2-50)
        <input
          type="number"
          min={2}
          max={50}
          className="mt-2 w-full rounded-lg border border-vault-accent/30 bg-vault-panel2 px-3 py-2 text-vault-text outline-none focus:border-vault-accent"
          value={maxParticipants}
          onChange={(event) => setMaxParticipants(event.target.value)}
        />
      </label>

      <label className="mt-4 block text-sm text-vault-muted">
        Passcode (optional, 4-8 digits)
        <input
          type="password"
          inputMode="numeric"
          pattern="\\d{4,8}"
          className="mt-2 w-full rounded-lg border border-vault-accent/30 bg-vault-panel2 px-3 py-2 text-vault-text outline-none focus:border-vault-accent"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="1234"
        />
      </label>

      {error ? <p className="mt-4 text-sm text-vault-danger">{error}</p> : null}

      <button
        type="submit"
        className="mt-6 w-full rounded-lg border border-vault-accentAlt/45 bg-vault-accentAlt/10 px-4 py-2 font-medium text-vault-accentAlt transition hover:bg-vault-accentAlt/20 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Generating quantum session...' : 'Create Session'}
      </button>
    </form>
  );
}
