import { useEffect, useRef } from 'react';

function StreamTile({ label, stream, muted = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream || null;
    }
  }, [stream]);

  if (!stream) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-vault-accent/35 bg-black/60">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="h-28 w-40 object-cover md:h-32 md:w-48"
      />
      <p className="border-t border-vault-accent/20 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-vault-muted">
        {label}
      </p>
    </div>
  );
}

export default function CallControls({
  localStream,
  remoteStreams,
  callMode,
  onStartVideo,
  onStartAudio,
  onShareScreen,
  onEndCall
}) {
  return (
    <section className="space-y-3 rounded-xl border border-vault-accent/30 bg-vault-panel2/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-vault-accent/35 bg-vault-accent/10 px-3 py-2 text-xs text-vault-accent hover:bg-vault-accent/20"
          onClick={onStartVideo}
        >
          Video Call
        </button>
        <button
          type="button"
          className="rounded-lg border border-vault-accent/35 bg-vault-accent/10 px-3 py-2 text-xs text-vault-accent hover:bg-vault-accent/20"
          onClick={onStartAudio}
        >
          Audio Only
        </button>
        <button
          type="button"
          className="rounded-lg border border-vault-accent/35 bg-vault-accent/10 px-3 py-2 text-xs text-vault-accent hover:bg-vault-accent/20"
          onClick={onShareScreen}
        >
          Share Screen
        </button>
        <button
          type="button"
          className="rounded-lg border border-vault-danger/50 bg-vault-danger/10 px-3 py-2 text-xs text-vault-danger hover:bg-vault-danger/20"
          onClick={onEndCall}
        >
          End Call
        </button>
      </div>

      <p className="text-[10px] uppercase tracking-[0.12em] text-vault-muted">
        Mode: {callMode || 'inactive'}
      </p>

      <div className="flex flex-wrap gap-2">
        <StreamTile label="You" stream={localStream} muted />
        {Object.entries(remoteStreams || {}).map(([peerId, stream]) => (
          <StreamTile key={peerId} label={peerId.slice(0, 8)} stream={stream} />
        ))}
      </div>
    </section>
  );
}
