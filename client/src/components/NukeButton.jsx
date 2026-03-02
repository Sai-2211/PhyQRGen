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
        className="rounded-lg border border-vault-danger/60 bg-vault-danger/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-vault-danger hover:bg-vault-danger/20 disabled:opacity-60"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Nuke Session
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="vault-panel w-full max-w-md rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-vault-danger">Destroy Session?</h3>
            <p className="mt-2 text-sm text-vault-muted">
              This will permanently destroy the session for all participants. This cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-vault-muted/30 px-3 py-2 text-sm text-vault-muted hover:text-vault-text"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg border border-vault-danger/60 bg-vault-danger/20 px-3 py-2 text-sm font-semibold text-vault-danger"
                onClick={() => {
                  setOpen(false);
                  onConfirm?.();
                }}
              >
                Confirm Nuke
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
