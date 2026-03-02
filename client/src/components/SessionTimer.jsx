import { useEffect, useMemo, useState } from 'react';

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default function SessionTimer({ expiresAt }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = useMemo(() => Math.max(0, Number(expiresAt || 0) - now), [expiresAt, now]);
  const underFiveMinutes = remainingMs <= 5 * 60 * 1000;

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm font-semibold tracking-[0.2em] ${
        underFiveMinutes
          ? 'border-vault-danger/60 bg-vault-danger/10 text-vault-danger'
          : 'border-vault-accent/40 bg-vault-accent/10 text-vault-accent'
      }`}
      title="Session timer is locked and cannot be modified"
    >
      {formatDuration(remainingMs)}
    </div>
  );
}
