function FilePreview({ message }) {
  const file = message.file;
  if (!file) {
    return null;
  }

  if (file.mimeType?.startsWith('image/')) {
    return <img src={file.dataUrl} alt={file.name} className="max-h-56 rounded-lg object-contain" />;
  }

  if (file.mimeType?.startsWith('audio/')) {
    return <audio controls src={file.dataUrl} className="max-w-full" />;
  }

  if (file.mimeType?.startsWith('video/')) {
    return <video controls src={file.dataUrl} className="max-h-64 rounded-lg" />;
  }

  return (
    <a
      className="inline-flex rounded border border-vault-accent/45 px-3 py-2 text-xs text-vault-accent"
      href={file.dataUrl}
      download={file.name}
    >
      Download {file.name}
    </a>
  );
}

export default function MessageBubble({ message }) {
  const outgoing = Boolean(message.outgoing);

  return (
    <article className={`flex ${outgoing ? 'justify-end' : 'justify-start'} animate-fadeRise`}>
      <div
        className={`max-w-[85%] rounded-xl border px-3 py-2 ${
          outgoing
            ? 'border-vault-accent/35 bg-vault-accent/10 text-vault-text'
            : 'border-vault-accentAlt/30 bg-vault-accentAlt/10 text-vault-text'
        }`}
      >
        <p className="text-[10px] uppercase tracking-[0.12em] text-vault-muted">
          {message.senderName || message.senderId}
        </p>

        {message.type === 'text' ? <p className="mt-1 whitespace-pre-wrap text-sm">{message.content}</p> : null}
        {message.type === 'file' ? (
          <div className="mt-2 space-y-2 text-sm">
            <p>{message.file?.name}</p>
            <FilePreview message={message} />
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-vault-muted">
          <span>🔒 encrypted</span>
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </article>
  );
}
