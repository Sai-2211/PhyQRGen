import { useEffect, useRef, useState } from 'react';
import API from '../api';
import { Html5Qrcode } from 'html5-qrcode';

function parseSessionRef(raw) {
  const text = String(raw || '').trim();

  if (text.startsWith('vaultchat://join/')) {
    const withoutScheme = text.replace('vaultchat://join/', '');
    return withoutScheme.split('?')[0].trim();
  }

  return text;
}

export default function JoinSession({ onJoin }) {
  const [displayName, setDisplayName] = useState('');
  const [sessionRef, setSessionRef] = useState('');
  const [passcode, setPasscode] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      if (!scannerOpen || scannerRef.current) {
        return;
      }

      const scanner = new Html5Qrcode('vaultchat-qr-reader');
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (cancelled) {
              return;
            }

            const parsed = parseSessionRef(decodedText);
            if (!parsed) {
              setError('Invalid QR payload');
              return;
            }

            setSessionRef(parsed);
            setScannerOpen(false);
          },
          () => {}
        );
      } catch (_error) {
        setError('Unable to access camera for QR scanning');
        setScannerOpen(false);
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear().catch(() => {}));
      }
    };
  }, [scannerOpen]);

  async function validateSession(ref) {
    const response = await API.get(`/api/session/${encodeURIComponent(ref)}/validate`);
    return response.data;
  }

  async function handleJoin(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const parsedRef = parseSessionRef(sessionRef).toUpperCase();
      if (!parsedRef) {
        throw new Error('Provide a session code or scan QR');
      }

      const validation = await validateSession(parsedRef);
      if (!validation?.valid) {
        throw new Error('Session invalid or expired');
      }

      setRequiresPasscode(Boolean(validation.requiresPasscode));
      if (validation.requiresPasscode && !passcode) {
        throw new Error('Passcode required for this session');
      }

      onJoin?.({
        sessionRef: validation.sessionId || parsedRef,
        displayName: displayName || 'Guest',
        passcode: passcode || ''
      });
    } catch (joinError) {
      setError(joinError.message || 'Unable to join session');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="vault-panel rounded-2xl p-6 md:p-8" onSubmit={handleJoin}>
      <h2 className="text-lg font-semibold text-vault-text">Join Session</h2>
      <p className="mt-1 text-sm text-vault-muted">Scan QR or enter code manually.</p>

      <button
        type="button"
        className="mt-6 w-full rounded-lg border border-vault-accent/35 bg-vault-accent/10 px-4 py-2 text-vault-accent transition hover:bg-vault-accent/20"
        onClick={() => setScannerOpen((current) => !current)}
      >
        {scannerOpen ? 'Close Scanner' : 'Scan QR Code'}
      </button>

      {scannerOpen ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-vault-accent/25 bg-black p-2">
          <div id="vaultchat-qr-reader" className="w-full" />
        </div>
      ) : null}

      <label className="mt-4 block text-sm text-vault-muted">
        Session code or ID
        <input
          className="mt-2 w-full rounded-lg border border-vault-accent/30 bg-vault-panel2 px-3 py-2 text-vault-text outline-none focus:border-vault-accent"
          value={sessionRef}
          onChange={(event) => setSessionRef(event.target.value)}
          placeholder="XKQF-2891 or session id"
        />
      </label>

      <label className="mt-4 block text-sm text-vault-muted">
        Display name
        <input
          className="mt-2 w-full rounded-lg border border-vault-accent/30 bg-vault-panel2 px-3 py-2 text-vault-text outline-none focus:border-vault-accent"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={40}
          placeholder="CipherFox"
        />
      </label>

      <label className="mt-4 block text-sm text-vault-muted">
        Passcode {requiresPasscode ? '(required)' : '(if set)'}
        <input
          type="password"
          inputMode="numeric"
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
        {loading ? 'Joining...' : 'Join Session'}
      </button>
    </form>
  );
}
