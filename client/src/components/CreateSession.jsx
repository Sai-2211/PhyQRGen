import { useMemo, useState } from 'react';
import API from '../api';
import QuantumProcess from './QuantumProcess';

const presetDurations = [
  { label: '15 minutes', value: 15 * 60 },
  { label: '30 minutes', value: 30 * 60 },
  { label: '1 hour', value: 60 * 60 },
  { label: '2 hours', value: 2 * 60 * 60 },
  { label: '4 hours', value: 4 * 60 * 60 },
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
      setError(requestError?.response?.data?.error || 'Unable to create session.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <section className="space-y-6">
        <div className="vault-panel overflow-hidden rounded-[30px] p-6 shadow-vault">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                Session created
              </p>
              <h2 className="mt-2 break-all text-2xl font-semibold tracking-[0.12em] text-vault-text sm:text-3xl">
                {result.shortCode}
              </h2>
            </div>
            <div className="w-fit rounded-full bg-vault-surface px-3 py-1 text-xs font-medium text-vault-muted">
              Expires {new Date(result.expiresAt).toLocaleTimeString()}
            </div>
          </div>
        </div>

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
    <form className="vault-panel overflow-hidden rounded-[34px] p-6 shadow-vault lg:p-8" onSubmit={handleCreate}>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Create room</p>
        <h2 className="text-3xl font-semibold text-vault-text sm:text-4xl">Start a private session</h2>
        <p className="max-w-2xl text-sm leading-6 text-vault-muted">
          Generate a temporary room, share a QR invite, and keep the experience focused on text and secure attachments.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <label className="block text-sm text-vault-muted">
          Display name
          <input
            className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={40}
            placeholder="Host name"
          />
        </label>

        <label className="block text-sm text-vault-muted">
          Max participants
          <input
            type="number"
            min={2}
            max={50}
            className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
            value={maxParticipants}
            onChange={(event) => setMaxParticipants(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <label className="block text-sm text-vault-muted">
          Session duration
          <select
            className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
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

        <label className="block text-sm text-vault-muted">
          Optional passcode
          <input
            type="password"
            inputMode="numeric"
            pattern="\d{4,8}"
            className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="4 to 8 digits"
          />
        </label>
      </div>

      {durationChoice === 'custom' ? (
        <label className="mt-5 block text-sm text-vault-muted">
          Custom duration in hours
          <input
            type="number"
            min={1}
            max={24}
            className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
            value={customHours}
            onChange={(event) => setCustomHours(event.target.value)}
          />
        </label>
      ) : null}

      {error ? <p className="mt-5 text-sm text-vault-danger">{error}</p> : null}

      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-vault-muted">
          Quantum entropy is requested when the room is created.
        </p>
        <button
          type="submit"
          className="w-full rounded-full bg-vault-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-vault-accentStrong disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          disabled={loading}
        >
          {loading ? 'Creating room...' : 'Create room'}
        </button>
      </div>
    </form>
  );
}
