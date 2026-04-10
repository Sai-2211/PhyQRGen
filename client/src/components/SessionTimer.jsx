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
      className={`inline-flex w-full flex-col rounded-[22px] border px-4 py-3 text-left sm:w-auto ${
        underFiveMinutes
          ? 'border-rose-200 bg-rose-50 text-vault-danger'
          : 'border-vault-border bg-white text-vault-text'
      }`}
      title="This timer is locked when the session is created."
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-vault-muted">
        Time left
      </span>
      <span className="mt-1 text-base font-semibold tracking-[0.14em]">{formatDuration(remainingMs)}</span>
    </div>
  );
}
