import { useRef, useState } from 'react';

function isSupportedFile(file) {
  if (file.type === 'application/pdf') {
    return true;
  }

  if (file.type.startsWith('image/')) {
    return true;
  }

  if (file.type.startsWith('audio/')) {
    return true;
  }

  return false;
}

function maxBytesForFile(file) {
  if (file.type.startsWith('image/')) {
    return 12 * 1024 * 1024;
  }

  if (file.type.startsWith('audio/')) {
    return 20 * 1024 * 1024;
  }

  return 20 * 1024 * 1024;
}

export default function MediaUpload({ onSend, disabled }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');

    if (!isSupportedFile(file)) {
      setError('Only PDFs, images, and audio voice notes are supported.');
      event.target.value = '';
      return;
    }

    const maxBytes = maxBytesForFile(file);
    if (file.size > maxBytes) {
      setError(`File is too large. Max size is ${Math.round(maxBytes / 1024 / 1024)}MB.`);
      event.target.value = '';
      return;
    }

    setBusy(true);

    try {
      await onSend?.(file);
    } catch (uploadError) {
      setError(uploadError?.message || 'Unable to send this encrypted attachment.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.m4a,.mp3,.wav,.ogg,.webm,audio/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || busy}
      />

      <button
        type="button"
        className="rounded-full border border-vault-border bg-white px-4 py-2.5 text-sm font-medium text-vault-text transition hover:bg-vault-surface disabled:opacity-50"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
      >
        {busy ? 'Encrypting attachment...' : 'Attach file'}
      </button>

      <p className="text-xs text-vault-muted">PDF, JPG or PNG, and voice notes up to 20MB.</p>

      {error ? <p className="text-xs text-vault-danger">{error}</p> : null}
    </div>
  );
}
