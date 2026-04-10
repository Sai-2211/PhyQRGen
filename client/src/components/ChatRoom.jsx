import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import MessageBubble from './MessageBubble';
import MediaUpload from './MediaUpload';
import SessionTimer from './SessionTimer';
import NukeButton from './NukeButton';

function AttachmentGuide() {
  return (
    <div className="vault-panel rounded-3xl p-4 shadow-vault">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
        Attachments
      </p>
      <p className="mt-2 text-sm text-vault-text">
        Optimized for PDFs, JPG or PNG images, and audio voice notes.
      </p>
      <p className="mt-2 text-xs text-vault-muted">
        Files are encrypted in the browser before relay and disappear when the session ends.
      </p>
    </div>
  );
}

function ParticipantList({ participants, selfSocketId, isCreator }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
      {participants.map((participant) => {
        const isSelf = participant.socketId === selfSocketId;

        return (
          <div
            key={participant.socketId}
            className="vault-panel rounded-2xl p-3 shadow-vault-soft"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-medium text-vault-text">
                {participant.displayName || participant.socketId.slice(0, 8)}
                {isSelf ? ' (you)' : ''}
              </p>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <p className="mt-1 text-xs text-vault-muted">{participant.socketId.slice(0, 10)}...</p>
            {isSelf && isCreator ? (
              <p className="mt-2 text-[11px] font-medium text-vault-accent">Session creator</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ShareModal({
  inviteLink,
  shortCode,
  entropyString,
  shareQrCopied,
  onClose,
  onCopyInviteLink,
  onDownloadQR,
  onShareLink
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
      <div className="vault-panel w-full max-w-lg overflow-hidden rounded-[32px] p-6 shadow-vault">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
              Share room
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-vault-text">Invite another participant</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-vault-border bg-white px-3 py-2 text-sm text-vault-muted transition hover:text-vault-text"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-vault-border bg-white p-4 shadow-vault-soft">
            <QRCodeSVG
              id="room-qr-svg"
              value={inviteLink}
              size={188}
              bgColor="#ffffff"
              fgColor="#111827"
            />
          </div>

          <div className="min-w-0 space-y-4">
            <div className="rounded-3xl border border-vault-border bg-vault-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                Room code
              </p>
              <p className="mt-2 break-all text-xl font-semibold tracking-[0.12em] text-vault-text sm:text-2xl">
                {shortCode}
              </p>
              <p className="mt-2 break-all text-xs text-vault-muted">{inviteLink}</p>
            </div>

            <div className="rounded-3xl border border-vault-border bg-vault-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                Quantum seed
              </p>
              <p className="mt-2 text-sm text-vault-text">
                {entropyString ? `${entropyString.slice(0, 28)}...${entropyString.slice(-12)}` : 'Ready'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-vault-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-vault-accentStrong"
                onClick={onCopyInviteLink}
              >
                {shareQrCopied ? 'Copied' : 'Copy link'}
              </button>
              <button
                type="button"
                className="rounded-full border border-vault-border bg-white px-4 py-2 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
                onClick={onDownloadQR}
              >
                Download QR
              </button>
              <button
                type="button"
                className="rounded-full border border-vault-border bg-white px-4 py-2 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
                onClick={onShareLink}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveModal({ onClose, onLeave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md">
      <div className="vault-panel w-full max-w-md overflow-hidden rounded-[32px] p-6 shadow-vault">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Leave room</p>
        <h2 className="mt-2 text-2xl font-semibold text-vault-text">Leave this session?</h2>
        <p className="mt-3 text-sm leading-6 text-vault-muted">
          You will return to the home screen and your local decrypted messages will be cleared from this device.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="flex-1 rounded-full border border-vault-border bg-white px-4 py-3 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
            onClick={onClose}
          >
            Stay
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-vault-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-vault-accentStrong"
            onClick={onLeave}
          >
            Leave room
          </button>
        </div>
      </div>
    </div>
  );
}

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
  endedReason,
  qrPayload,
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
    if (!value) {
      return;
    }

    setDraft('');
    onSendText?.(value);
  }

  async function handleCopyInviteLink() {
    if (!qrPayload) {
      return;
    }

    try {
      await navigator.clipboard.writeText(qrPayload);
      setShareQrCopied(true);
      setTimeout(() => setShareQrCopied(false), 1800);
    } catch {}
  }

  function handleShareLink() {
    const link = qrPayload || `${window.location.origin}/room/${sessionId}`;

    if (navigator.share) {
      navigator
        .share({
          title: `Join VaultChat Room ${shortCode}`,
          text: `Join my private room with code ${shortCode}.`,
          url: link
        })
        .catch(() => {});
      return;
    }

    navigator.clipboard.writeText(link).catch(() => {});
  }

  function handleDownloadQR() {
    const svg = document.getElementById('room-qr-svg');
    if (!svg) {
      return;
    }

    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaultchat-room-${shortCode || sessionId.slice(0, 8)}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (endedReason) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-12">
        <section className="vault-panel w-full rounded-[36px] p-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
            VaultChat session
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-vault-text">
            Session {endedReason === 'nuked' ? 'destroyed' : 'ended'}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-vault-muted">
            The room is closed and this device has already cleared local keys and decrypted content.
          </p>
          <button
            type="button"
            className="mt-8 rounded-full bg-vault-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-vault-accentStrong"
            onClick={onLeave}
          >
            Return home
          </button>
        </section>
      </main>
    );
  }

  const inviteLink = qrPayload || `${window.location.origin}/room/${sessionId}`;

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <section className="grid gap-6 xl:min-h-[calc(100vh-3rem)] xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
          <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
            <div className="vault-panel rounded-[32px] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                Participants
              </p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="text-2xl font-semibold text-vault-text">{onlineCount}</p>
                  <p className="text-sm text-vault-muted">currently in the room</p>
                </div>
                <SessionTimer expiresAt={expiresAt} />
              </div>
            </div>

            <ParticipantList
              participants={participants}
              selfSocketId={selfSocketId}
              isCreator={isCreator}
            />

            <AttachmentGuide />
          </aside>

          <section className="vault-panel flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[36px]">
            <header className="border-b border-vault-border px-5 py-5 lg:px-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
                    Secure room
                  </p>
                  <h1 className="mt-2 break-all text-2xl font-semibold tracking-[0.12em] text-vault-text sm:text-3xl">
                    {shortCode}
                  </h1>
                  <p className="mt-2 text-sm text-vault-muted">
                    {selfParticipant?.displayName || 'Guest'} in a temporary encrypted conversation.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {isCreator && qrPayload ? (
                    <button
                      type="button"
                      className="rounded-full border border-vault-border bg-white px-4 py-2.5 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
                      onClick={() => setShowSharePanel(true)}
                    >
                      Share invite
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full border border-vault-border bg-white px-4 py-2.5 text-sm font-medium text-vault-text transition hover:bg-vault-surface"
                    onClick={() => setShowLeaveConfirm(true)}
                  >
                    Leave room
                  </button>
                  <NukeButton visible={isCreator} onConfirm={onNuke} />
                </div>
              </div>
            </header>

            <section ref={feedRef} className="scroll-slim flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5 lg:px-7">
              {messages.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-vault-border bg-vault-surface px-5 py-8 text-center">
                  <p className="text-base font-medium text-vault-text">Start the conversation</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-vault-muted">
                    Send text or attach a PDF, image, or voice note. Everything is encrypted before it leaves this browser.
                  </p>
                </div>
              ) : null}

              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </section>

            <footer className="border-t border-vault-border px-4 py-5 sm:px-5 lg:px-7">
              <div className="rounded-[28px] border border-vault-border bg-vault-surface p-4">
                <form className="flex flex-col gap-3" onSubmit={handleSendText}>
                  <textarea
                    className="min-h-[104px] w-full resize-none rounded-[24px] border border-vault-border bg-white px-4 py-3 text-sm text-vault-text outline-none transition focus:border-vault-accent"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a message"
                    maxLength={4000}
                  />

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <MediaUpload onSend={onSendFile} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-vault-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-vault-accentStrong lg:w-auto"
                    >
                      Send message
                    </button>
                  </div>
                </form>
              </div>
            </footer>
          </section>
        </section>
      </main>

      {showLeaveConfirm ? (
        <LeaveModal
          onClose={() => setShowLeaveConfirm(false)}
          onLeave={() => {
            setShowLeaveConfirm(false);
            onLeave?.();
          }}
        />
      ) : null}

      {showSharePanel && isCreator ? (
        <ShareModal
          inviteLink={inviteLink}
          shortCode={shortCode}
          entropyString={entropyString}
          shareQrCopied={shareQrCopied}
          onClose={() => setShowSharePanel(false)}
          onCopyInviteLink={handleCopyInviteLink}
          onDownloadQR={handleDownloadQR}
          onShareLink={handleShareLink}
        />
      ) : null}
    </>
  );
}
