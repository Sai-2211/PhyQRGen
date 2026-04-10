import { useState } from 'react';

export default function NukeButton({ visible, onConfirm, disabled }) {
  const [open, setOpen] = useState(false);

  if (!visible) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-vault-danger transition hover:bg-rose-100 disabled:opacity-60"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        End room for everyone
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[32px] border border-vault-border bg-vault-panel p-6 shadow-vault">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Permanent action</p>
            <h3 className="mt-2 text-2xl font-semibold text-vault-text">Destroy this room?</h3>
            <p className="mt-3 text-sm leading-6 text-vault-muted">
              This immediately closes the room for every participant and wipes the in-memory session state.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-full border border-vault-border bg-white px-4 py-3 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-vault-danger px-4 py-3 text-sm font-medium text-white transition hover:bg-[#991b1b]"
                onClick={() => {
                  setOpen(false);
                  onConfirm?.();
                }}
              >
                Destroy room
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
