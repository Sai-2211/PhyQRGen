import { useMemo, useRef, useState } from 'react';

function maxBytesForFile(file) {
  if (file.type.startsWith('image/')) {
    return 10 * 1024 * 1024;
  }

  if (file.type.startsWith('audio/')) {
    return 25 * 1024 * 1024;
  }

  if (file.type.startsWith('video/')) {
    return 100 * 1024 * 1024;
  }

  return 50 * 1024 * 1024;
}

export default function MediaUpload({ onSend, disabled }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const helperText = useMemo(
    () => 'Images 10MB, audio 25MB, video 100MB, other files 50MB',
    []
  );

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');
    const maxBytes = maxBytesForFile(file);
    if (file.size > maxBytes) {
      setError(`File too large for type (${Math.round(maxBytes / 1024 / 1024)}MB max)`);
      return;
    }

    setBusy(true);
    try {
      await onSend?.(file);
    } catch (uploadError) {
      setError(uploadError?.message || 'Unable to send encrypted file');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || busy}
      />
      <button
        type="button"
        className="rounded-lg border border-vault-accent/35 bg-vault-accent/10 px-3 py-2 text-sm text-vault-accent hover:bg-vault-accent/20 disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
      >
        {busy ? 'Encrypting...' : 'Attach'}
      </button>
      <span className="hidden text-xs text-vault-muted lg:block">{helperText}</span>
      {error ? <span className="text-xs text-vault-danger">{error}</span> : null}
    </div>
  );
}
