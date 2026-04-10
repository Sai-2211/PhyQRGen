import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import API from '../api';

function extractSessionRef(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    return '';
  }

  if (text.startsWith('vaultchat://join/')) {
    return text.replace('vaultchat://join/', '').split('?')[0].trim();
  }

  try {
    const parsedUrl = new URL(text);
    const roomMatch = parsedUrl.pathname.match(/\/room\/([^/?#]+)/i);
    if (roomMatch?.[1]) {
      return roomMatch[1].trim();
    }
  } catch {}

  return text;
}

async function stopScanner(scanner) {
  if (!scanner) {
    return;
  }

  try {
    await scanner.stop();
  } catch {}

  try {
    await scanner.clear();
  } catch {}
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
  const displayNameRef = useRef('');
  const passcodeRef = useRef('');

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  useEffect(() => {
    passcodeRef.current = passcode;
  }, [passcode]);

  async function validateSession(ref) {
    const response = await API.get(`/api/session/${encodeURIComponent(ref)}/validate`);
    return response.data;
  }

  async function attemptJoin(rawRef, allowGuestFallback = true) {
    const parsedRef = extractSessionRef(rawRef).toUpperCase();
    if (!parsedRef) {
      throw new Error('Provide a room code or scan a QR invite.');
    }

    const validation = await validateSession(parsedRef);
    if (!validation?.valid) {
      throw new Error('Room not found or already expired.');
    }

    setRequiresPasscode(Boolean(validation.requiresPasscode));
    if (validation.requiresPasscode && !passcodeRef.current) {
      throw new Error('This room requires a passcode. Enter it to continue.');
    }

    onJoin?.({
      sessionRef: validation.sessionId || parsedRef,
      displayName: displayNameRef.current.trim() || (allowGuestFallback ? 'Guest' : ''),
      passcode: passcodeRef.current || ''
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      if (!scannerOpen || scannerRef.current) {
        return;
      }

      const scanner = new Html5Qrcode('vaultchat-qr-reader', { verbose: false });
      scannerRef.current = scanner;

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) {
          throw new Error('No camera available.');
        }

        const preferredCamera =
          cameras.find((camera) => /back|rear|environment/i.test(camera.label)) || cameras[0];

        await scanner.start(
          preferredCamera.id,
          {
            fps: 10,
            aspectRatio: 1.3333333,
            qrbox: { width: 240, height: 240 }
          },
          async (decodedText) => {
            if (cancelled) {
              return;
            }

            const parsed = extractSessionRef(decodedText);
            if (!parsed) {
              setError('The scanned code did not contain a room link.');
              return;
            }

            setError('');
            setSessionRef(parsed);
            setLoading(true);

            await stopScanner(scanner);
            scannerRef.current = null;
            setScannerOpen(false);

            try {
              await attemptJoin(parsed, true);
            } catch (joinError) {
              setError(joinError.message || 'Unable to join this room.');
            } finally {
              setLoading(false);
            }
          },
          () => {}
        );
      } catch (scannerError) {
        await stopScanner(scanner);
        scannerRef.current = null;
        setError(scannerError.message || 'Unable to access the camera scanner.');
        setScannerOpen(false);
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      const currentScanner = scannerRef.current;
      scannerRef.current = null;
      stopScanner(currentScanner);
    };
  }, [scannerOpen]);

  async function handleJoin(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await attemptJoin(sessionRef, true);
    } catch (joinError) {
      setError(joinError.message || 'Unable to join this room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="vault-panel rounded-[34px] p-6 shadow-vault lg:p-8" onSubmit={handleJoin}>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Join room</p>
        <h2 className="text-3xl font-semibold text-vault-text">Scan or enter a room code</h2>
        <p className="max-w-2xl text-sm leading-6 text-vault-muted">
          The in-app scanner now resolves the actual room ID from the invite URL before routing you into the room.
        </p>
      </div>

      <button
        type="button"
        className="mt-8 rounded-full border border-vault-border bg-white px-5 py-3 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
        onClick={() => setScannerOpen((current) => !current)}
      >
        {scannerOpen ? 'Close scanner' : 'Open QR scanner'}
      </button>

      {scannerOpen ? (
        <div className="mt-5 rounded-[28px] border border-vault-border bg-white p-4 shadow-vault-soft">
          <div id="vaultchat-qr-reader" className="w-full overflow-hidden rounded-[20px]" />
          <p className="mt-3 text-xs text-vault-muted">
            Hold the code steady inside the frame. Room links and room IDs are both supported.
          </p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block text-sm text-vault-muted">
          Room code or scanned room ID
          <input
            className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
            value={sessionRef}
            onChange={(event) => setSessionRef(event.target.value)}
            placeholder="XKQF-2891 or room URL"
          />
        </label>

        <label className="block text-sm text-vault-muted">
          Display name
          <input
            className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={40}
            placeholder="Optional, defaults to Guest"
          />
        </label>
      </div>

      <label className="mt-5 block text-sm text-vault-muted">
        Passcode {requiresPasscode ? '(required)' : '(if enabled)'}
        <input
          type="password"
          inputMode="numeric"
          className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
          value={passcode}
          onChange={(event) => setPasscode(event.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="4 to 8 digits"
        />
      </label>

      {error ? <p className="mt-5 text-sm text-vault-danger">{error}</p> : null}

      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-vault-muted">If the room has no passcode, scanning routes you in immediately.</p>
        <button
          type="submit"
          className="rounded-full bg-vault-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-vault-accentStrong disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Joining room...' : 'Join room'}
        </button>
      </div>
    </form>
  );
}
