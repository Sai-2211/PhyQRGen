function FilePreview({ file }) {
  if (!file) {
    return null;
  }

  if (file.mimeType?.startsWith('image/')) {
    return <img src={file.dataUrl} alt={file.name} className="max-h-64 rounded-[22px] object-contain" />;
  }

  if (file.mimeType?.startsWith('audio/')) {
    return <audio controls src={file.dataUrl} className="max-w-full" />;
  }

  if (file.mimeType === 'application/pdf') {
    return (
      <a
        className="inline-flex items-center gap-2 rounded-full border border-vault-border bg-white px-4 py-2 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
        href={file.dataUrl}
        download={file.name}
      >
        Open PDF
      </a>
    );
  }

  return (
    <a
      className="inline-flex items-center gap-2 rounded-full border border-vault-border bg-white px-4 py-2 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
      href={file.dataUrl}
      download={file.name}
    >
      Download file
    </a>
  );
}

export default function MessageBubble({ message }) {
  const outgoing = Boolean(message.outgoing);

  return (
    <article className={`flex ${outgoing ? 'justify-end' : 'justify-start'} animate-fadeRise`}>
      <div
        className={`max-w-full overflow-hidden rounded-[28px] border px-4 py-3 shadow-vault-soft sm:max-w-[92%] lg:max-w-[88%] ${
          outgoing
            ? 'border-blue-100 bg-blue-50 text-vault-text'
            : 'border-vault-border bg-white text-vault-text'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="break-words text-xs font-semibold uppercase tracking-[0.14em] text-vault-muted">
            {message.senderName || message.senderId}
          </p>
          <p className="text-[11px] text-vault-muted">{new Date(message.timestamp).toLocaleTimeString()}</p>
        </div>

        {message.type === 'text' ? (
          <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-6 text-vault-text">{message.content}</p>
        ) : null}

        {message.type === 'file' ? (
          <div className="mt-3 space-y-3">
            <div>
              <p className="break-words text-sm font-medium text-vault-text">{message.file?.name}</p>
              <p className="mt-1 text-xs text-vault-muted">
                {(message.file?.mimeType || 'Attachment').replace('/', ' · ')}
              </p>
            </div>
            <FilePreview file={message.file} />
          </div>
        ) : null}

        <div className="mt-3 inline-flex rounded-full bg-vault-surface px-3 py-1 text-[11px] font-medium text-vault-muted">
          Encrypted in browser
        </div>
      </div>
    </article>
  );
}
