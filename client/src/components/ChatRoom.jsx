import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  endedReason,
  // QR/quantum data passed from room context (available for the host)
  qrPayload,
  qrngSource,
  entropyString
}) {
  const [draft, setDraft] = useState('');
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [shareQrCopied, setShareQrCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
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
    if (!value) return;
    setDraft('');
    onSendText?.(value);
  }

  async function handleCopyInviteLink() {
    if (!qrPayload) return;
    try {
      await navigator.clipboard.writeText(qrPayload);
      setShareQrCopied(true);
      setTimeout(() => setShareQrCopied(false), 2000);
    } catch {}
  }

  function handleShareLink() {
    const link = qrPayload || `${window.location.origin}/room/${sessionId}`;
    if (navigator.share) {
      navigator.share({
        title: `Join VaultChat Room — ${shortCode}`,
        text: `Join my quantum-encrypted ephemeral room. Code: ${shortCode}`,
        url: link
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(link).catch(() => {});
    }
  }

  function handleDownloadQR() {
    const svg = document.getElementById('room-qr-svg');
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultchat-qr-${shortCode || sessionId.slice(0, 8)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
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

  const inviteLink = qrPayload || `${window.location.origin}/room/${sessionId}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-3 py-4 md:px-6 md:py-6">
      <section className="vault-panel grid min-h-[calc(100vh-3rem)] grid-cols-1 overflow-hidden rounded-2xl lg:grid-cols-[270px_1fr]">

        {/* ── Sidebar ── */}
        <aside className="border-b border-vault-accent/20 bg-vault-panel2/80 p-4 lg:border-b-0 lg:border-r flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-[0.16em] text-vault-accent">Participants</h2>
            <span className="text-xs text-vault-muted">{onlineCount} online</span>
          </div>

          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.socketId}
                className="rounded-lg border border-vault-accent/20 bg-black/20 px-3 py-2 text-xs"
              >
                <p className="font-medium text-vault-text">
                  {participant.displayName || participant.socketId.slice(0, 8)}
                  {participant.socketId === selfSocketId ? ' (you)' : ''}
                  {participant.socketId === selfSocketId && isCreator ? ' 👑' : ''}
                </p>
                <p className="mt-1 text-vault-muted">{participant.socketId.slice(0, 10)}…</p>
              </div>
            ))}
          </div>

          {/* Host controls in sidebar */}
          {isCreator && qrPayload && (
            <div style={{ marginTop: 'auto' }}>
              <button
                type="button"
                onClick={() => setShowSharePanel(true)}
                style={{
                  width: '100%',
                  padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1px solid rgba(168,85,247,0.45)',
                  background: 'rgba(168,85,247,0.1)',
                  color: '#c084fc', cursor: 'pointer', transition: 'all 0.2s',
                  letterSpacing: '0.05em'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(168,85,247,0.22)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(168,85,247,0.1)'}
              >
                📤 Share Room QR
              </button>
            </div>
          )}
        </aside>

        {/* ── Main Chat Area ── */}
        <section className="flex min-h-0 flex-col">
          {/* Header */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-vault-accent/20 px-4 py-3 md:px-5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-vault-muted">VaultChat Room</p>
              <p className="text-sm text-vault-text">{shortCode || sessionId.slice(0, 12)}</p>
              <p className="text-[10px] text-vault-muted">{selfParticipant?.displayName || 'Anonymous'}</p>
            </div>

            <div className="flex items-center gap-2">
              <SessionTimer expiresAt={expiresAt} />

              {/* Share QR button — for host (compact, in header) */}
              {isCreator && qrPayload && (
                <button
                  type="button"
                  onClick={() => setShowSharePanel(true)}
                  title="Share room QR code"
                  style={{
                    padding: '5px 10px', borderRadius: 7, fontSize: 11,
                    border: '1px solid rgba(168,85,247,0.4)',
                    background: 'rgba(168,85,247,0.1)',
                    color: '#c084fc', cursor: 'pointer', letterSpacing: '0.04em'
                  }}
                >
                  QR
                </button>
              )}

              {/* Leave Room button — visible to ALL users */}
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(true)}
                title="Leave room"
                style={{
                  padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  border: '1px solid rgba(0,212,255,0.35)',
                  background: 'rgba(0,212,255,0.08)',
                  color: '#00d4ff', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,212,255,0.08)'}
              >
                ← Leave
              </button>

              <NukeButton visible={isCreator} onConfirm={onNuke} />
            </div>
          </header>

          {/* Call Controls */}
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

          {/* Messages feed */}
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

          {/* Message input footer */}
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

      {/* ── Leave Room Confirmation Modal ── */}
      {showLeaveConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            width: '100%', maxWidth: 360, borderRadius: 16,
            border: '1px solid rgba(0,212,255,0.3)',
            background: 'linear-gradient(145deg, #101316, #0c0e11)',
            padding: 28, textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
          }}>
            <p style={{ fontSize: 24, margin: '0 0 8px' }}>🚪</p>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ecf8ff', margin: '0 0 8px' }}>Leave Room?</h2>
            <p style={{ fontSize: 12, color: '#7f9cab', margin: '0 0 20px', lineHeight: 1.6 }}>
              You'll return to the home screen. Your encrypted messages will disappear from this device.
              The room will remain active for other participants.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#7f9cab', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowLeaveConfirm(false); onLeave?.(); }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  border: '1px solid rgba(0,212,255,0.5)',
                  background: 'rgba(0,212,255,0.15)',
                  color: '#00d4ff', cursor: 'pointer'
                }}
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share QR Modal (Host only) ── */}
      {showSharePanel && isCreator && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          overflowY: 'auto'
        }}>
          <div style={{
            width: '100%', maxWidth: 440, borderRadius: 20,
            border: '1px solid rgba(168,85,247,0.35)',
            background: 'linear-gradient(160deg, rgba(10,10,20,0.98) 0%, rgba(5,5,15,0.98) 100%)',
            padding: 28,
            boxShadow: '0 0 64px rgba(168,85,247,0.15), 0 32px 80px rgba(0,0,0,0.7)'
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#c084fc', margin: 0 }}>
                  Quantum-Seeded
                </p>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#ecf8ff', margin: '2px 0 0' }}>
                  Share Room Invite
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSharePanel(false)}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#7f9cab', cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* QR code */}
            <div style={{
              display: 'flex', justifyContent: 'center', marginBottom: 20
            }}>
              <div style={{
                background: '#fff', padding: 14, borderRadius: 14,
                boxShadow: '0 0 40px rgba(168,85,247,0.3)',
                border: '2px solid rgba(168,85,247,0.5)'
              }}>
                {inviteLink && (
                  <QRCodeSVG
                    id="room-qr-svg"
                    value={inviteLink}
                    size={220}
                    bgColor="#ffffff"
                    fgColor="#0a0a0a"
                    level="M"
                  />
                )}
              </div>
            </div>

            {/* Session info */}
            <div style={{
              borderRadius: 10, border: '1px solid rgba(168,85,247,0.2)',
              background: 'rgba(168,85,247,0.06)',
              padding: '10px 14px', marginBottom: 16, textAlign: 'center'
            }}>
              <p style={{ fontSize: 9, color: '#7f9cab', margin: '0 0 3px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Session Code
              </p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#c084fc', letterSpacing: '0.3em', margin: 0 }}>
                {shortCode}
              </p>
            </div>

            {/* Entropy badge */}
            {qrngSource && (
              <div style={{
                borderRadius: 8, padding: '7px 12px', marginBottom: 16,
                background: qrngSource === 'quantum' ? 'rgba(0,255,136,0.08)' : 'rgba(255,200,0,0.08)',
                border: `1px solid ${qrngSource === 'quantum' ? 'rgba(0,255,136,0.25)' : 'rgba(255,200,0,0.25)'}`,
                fontSize: 11, color: qrngSource === 'quantum' ? '#00ff88' : '#ffc800',
                textAlign: 'center'
              }}>
                ⚛ QR seeded by {qrngSource === 'quantum' ? 'ANU Quantum Random Number Generator' : 'CSPRNG fallback'}
              </div>
            )}

            {/* Share actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleShareLink}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 600,
                  border: '1px solid rgba(168,85,247,0.5)',
                  background: 'rgba(168,85,247,0.12)',
                  color: '#c084fc', cursor: 'pointer'
                }}
              >
                📤 Share Link
              </button>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 600,
                  border: '1px solid rgba(0,255,136,0.4)',
                  background: 'rgba(0,255,136,0.08)',
                  color: '#00ff88', cursor: 'pointer'
                }}
              >
                {shareQrCopied ? '✓ Copied!' : '⎘ Copy Link'}
              </button>
              <button
                type="button"
                onClick={handleDownloadQR}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 12, fontWeight: 600,
                  border: '1px solid rgba(0,212,255,0.4)',
                  background: 'rgba(0,212,255,0.08)',
                  color: '#00d4ff', cursor: 'pointer'
                }}
              >
                ⬇ Download QR
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
