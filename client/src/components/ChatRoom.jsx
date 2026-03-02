import { useEffect, useMemo, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import MediaUpload from './MediaUpload';
import SessionTimer from './SessionTimer';
import CallControls from './CallControls';
import NukeButton from './NukeButton';

export default function ChatRoom({
  sessionId,
  shortCode,
  participants,
  selfSocketId,
  messages,
  expiresAt,
  isCreator,
  onSendText,
  onSendFile,
  onNuke,
  onLeave,
  callState,
  endedReason
}) {
  const [draft, setDraft] = useState('');
  const feedRef = useRef(null);

  const onlineCount = participants.length;
  const selfParticipant = useMemo(
    () => participants.find((participant) => participant.socketId === selfSocketId),
    [participants, selfSocketId]
  );

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSendText(event) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) {
      return;
    }

    setDraft('');
    onSendText?.(value);
  }

  if (endedReason) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
        <section className="vault-panel w-full rounded-2xl p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-vault-muted">VaultChat Session</p>
          <h1 className="mt-3 text-2xl font-semibold text-vault-danger">
            Session {endedReason === 'nuked' ? 'Destroyed' : 'Ended'}
          </h1>
          <p className="mt-3 text-sm text-vault-muted">
            All in-memory keys and message buffers were wiped from this client.
          </p>
          <button
            type="button"
            className="mt-6 rounded-lg border border-vault-accent/40 px-4 py-2 text-vault-accent"
            onClick={onLeave}
          >
            Return Home
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-3 py-4 md:px-6 md:py-6">
      <section className="vault-panel grid min-h-[calc(100vh-3rem)] grid-cols-1 overflow-hidden rounded-2xl lg:grid-cols-[270px_1fr]">
        <aside className="border-b border-vault-accent/20 bg-vault-panel2/80 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-[0.16em] text-vault-accent">Participants</h2>
            <span className="text-xs text-vault-muted">{onlineCount} online</span>
          </div>

          <div className="mt-4 space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.socketId}
                className="rounded-lg border border-vault-accent/20 bg-black/20 px-3 py-2 text-xs"
              >
                <p className="font-medium text-vault-text">
                  {participant.displayName || participant.socketId.slice(0, 8)}
                  {participant.socketId === selfSocketId ? ' (you)' : ''}
                </p>
                <p className="mt-1 text-vault-muted">{participant.socketId.slice(0, 10)}...</p>
              </div>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-vault-accent/20 px-4 py-3 md:px-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-vault-muted">VaultChat Room</p>
              <p className="text-sm text-vault-text">{shortCode || sessionId.slice(0, 12)}</p>
              <p className="text-[10px] text-vault-muted">{selfParticipant?.displayName || 'Anonymous'}</p>
            </div>

            <div className="flex items-center gap-2">
              <SessionTimer expiresAt={expiresAt} />
              <NukeButton visible={isCreator} onConfirm={onNuke} />
            </div>
          </header>

          <div className="border-b border-vault-accent/20 p-3 md:p-4">
            <CallControls
              localStream={callState.localStream}
              remoteStreams={callState.remoteStreams}
              callMode={callState.callMode}
              onStartVideo={callState.onStartVideo}
              onStartAudio={callState.onStartAudio}
              onShareScreen={callState.onShareScreen}
              onEndCall={callState.onEndCall}
            />
          </div>

          <section ref={feedRef} className="scroll-slim flex-1 space-y-3 overflow-y-auto px-4 py-4 md:px-6">
            {messages.length === 0 ? (
              <p className="rounded-lg border border-dashed border-vault-accent/30 bg-black/20 px-4 py-3 text-sm text-vault-muted">
                No messages yet. All payloads are end-to-end encrypted before relay.
              </p>
            ) : null}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </section>

          <footer className="border-t border-vault-accent/20 p-3 md:p-4">
            <form className="flex flex-col gap-3 md:flex-row md:items-center" onSubmit={handleSendText}>
              <MediaUpload onSend={onSendFile} />
              <input
                className="flex-1 rounded-lg border border-vault-accent/30 bg-vault-panel2 px-3 py-2 text-vault-text outline-none focus:border-vault-accent"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type encrypted message"
                maxLength={4000}
              />
              <button
                type="submit"
                className="rounded-lg border border-vault-accentAlt/40 bg-vault-accentAlt/10 px-4 py-2 text-sm font-medium text-vault-accentAlt hover:bg-vault-accentAlt/20"
              >
                Send
              </button>
            </form>
          </footer>
        </section>
      </section>
    </main>
  );
}
