import { useMemo, useState } from 'react';
import API from '../api';
import QuantumProcess from './QuantumProcess';

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

      const response = await API.post('/api/session/create', payload);
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
      <section className="w-full space-y-5">
        {/* Session created badge */}
        <div className="flex items-center justify-center gap-3">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 999,
            background: 'rgba(0,255,136,0.12)',
            border: '1px solid rgba(0,255,136,0.35)'
          }}>
            <span style={{ fontSize: 14 }}>✓</span>
            <span style={{ fontSize: 12, color: '#00ff88', fontWeight: 700, letterSpacing: '0.15em' }}>
              SESSION CREATED
            </span>
          </div>
        </div>

        {/* Session meta info */}
        <div style={{
          borderRadius: 12,
          border: '1px solid rgba(0,212,255,0.2)',
          background: 'rgba(0,0,0,0.4)',
          padding: '12px 16px',
          display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center'
        }}>
          <div>
            <p style={{ fontSize: 9, color: '#7f9cab', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Session Code</p>
            <p style={{ fontSize: 20, color: '#00ff88', fontWeight: 800, letterSpacing: '0.25em', margin: '2px 0 0' }}>{result.shortCode}</p>
          </div>
          <div style={{ width: 1, height: 36, background: 'rgba(0,212,255,0.2)' }} />
          <div>
            <p style={{ fontSize: 9, color: '#7f9cab', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Expires</p>
            <p style={{ fontSize: 12, color: '#ecf8ff', margin: '3px 0 0' }}>{new Date(result.expiresAt).toLocaleString()}</p>
          </div>
          <div style={{ width: 1, height: 36, background: 'rgba(0,212,255,0.2)', display: 'none' }} />
        </div>

        {/* ★ Main Feature — Quantum Process Visualizer */}
        <QuantumProcess
          entropyBytes={result.entropyString || ''}
          qrngSource={result.qrngSource}
          quantumNumber={result.sessionId || ''}
          qrPayload={result.qrPayload}
          shortCode={result.shortCode}
        />
      </section>
    );
  }

  return (
    <form className="vault-panel rounded-2xl p-6 md:p-8" onSubmit={handleCreate}>
      <h2 className="text-lg font-semibold text-vault-text">Create Secure Session</h2>
      <p className="mt-1 text-sm text-vault-muted">
        Create a quantum-encrypted ephemeral room. Entropy is sourced from the ANU Quantum Random Number Generator.
      </p>

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
          pattern="\d{4,8}"
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
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>⚛</span>
            Fetching quantum entropy…
          </span>
        ) : (
          '⚛ Create Quantum-Encrypted Session'
        )}
      </button>

      {/* Quantum badge */}
      <p style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#7f9cab' }}>
        Session key derived from ANU Quantum Random Number Generator
      </p>
    </form>
  );
}
