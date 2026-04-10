import { useCallback, useEffect, useRef, useState } from 'react';
import API from '../api';
import ChatRoom from '../components/ChatRoom';
import useSocket from '../hooks/useSocket';
import useSession from '../hooks/useSession';
import { generateKeyPair } from '../crypto/keyExchange';
import { encryptFileForRecipient, encryptTextForRecipient } from '../crypto/encrypt';
import { decryptFileFromSender, decryptTextFromSender } from '../crypto/decrypt';

export default function Room({ sessionRef, navigation, initialPayload }) {
  const { socket, status } = useSocket();

  const [validationLoading, setValidationLoading] = useState(true);
  const [validationError, setValidationError] = useState('');
  const [resolvedSessionId, setResolvedSessionId] = useState('');
  const [requiresPasscode, setRequiresPasscode] = useState(false);
  const [identity, setIdentity] = useState({
    displayName: initialPayload?.displayName || '',
    passcode: initialPayload?.passcode || '',
    creatorSecret: initialPayload?.creatorSecret || ''
  });
  const [messages, setMessages] = useState([]);
  const [cryptoError, setCryptoError] = useState('');
  const [joinRequested, setJoinRequested] = useState(() => Boolean(initialPayload?.creatorSecret));
  const handleSessionEnded = useCallback(() => { }, []);

  const createdObjectUrlsRef = useRef([]);
  const [keyPair, setKeyPair] = useState(() => generateKeyPair());

  useEffect(() => {
    let active = true;

    async function validate() {
      try {
        setValidationLoading(true);
        setValidationError('');

        const response = await API.get(
          `/api/session/${encodeURIComponent(String(sessionRef || ''))}/validate`
        );

        if (!active) {
          return;
        }

        if (!response.data?.valid) {
          throw new Error('Session invalid or expired');
        }

        setResolvedSessionId(response.data.sessionId || String(sessionRef || '').toLowerCase());
        setRequiresPasscode(Boolean(response.data.requiresPasscode));
      } catch (error) {
        if (!active) {
          return;
        }

        setValidationError(error?.response?.data?.error || error.message || 'Session validation failed');
      } finally {
        if (active) {
          setValidationLoading(false);
        }
      }
    }

    validate();
    return () => {
      active = false;
    };
  }, [sessionRef]);

  const canEnterRoom = Boolean(
    resolvedSessionId &&
    identity.displayName.trim() &&
    (!requiresPasscode || /^\d{4,8}$/.test(identity.passcode || ''))
  );

  const session = useSession({
    socket,
    sessionId: joinRequested && canEnterRoom ? resolvedSessionId : null,
    displayName: identity.displayName,
    passcode: identity.passcode,
    creatorSecret: identity.creatorSecret,
    keyPair,
    onSessionEnded: handleSessionEnded
  });

  const isCreator = Boolean(socket?.id && session.creatorSocketId === socket.id);

  useEffect(() => {
    setJoinRequested(Boolean(initialPayload?.creatorSecret));
  }, [initialPayload?.creatorSecret, resolvedSessionId]);

  useEffect(() => {
    if (!session.joinError) {
      return;
    }

    setJoinRequested(false);
  }, [session.joinError]);

  useEffect(() => {
    if (!socket || !keyPair?.secretKey) {
      return undefined;
    }

    const onMessageReceived = (payload) => {
      const senderPublicKey = session.publicKeys?.[payload.from];
      if (!senderPublicKey) {
        return;
      }

      try {
        if (payload.messageType === 'text') {
          const decrypted = decryptTextFromSender({
            ciphertext: payload.ciphertext,
            nonce: payload.nonce,
            senderPublicKey,
            recipientSecretKey: keyPair.secretKey
          });

          setMessages((current) => [
            ...current,
            {
              id: `m_${payload.timestamp}_${Math.random().toString(16).slice(2, 8)}`,
              type: 'text',
              content: decrypted.content,
              senderId: payload.from,
              senderName: decrypted.senderName || payload.from.slice(0, 8),
              timestamp: payload.timestamp,
              outgoing: false
            }
          ]);
          return;
        }

        if (payload.messageType === 'file') {
          const encryptedPayload = JSON.parse(payload.ciphertext);
          const decryptedBytes = decryptFileFromSender({
            payload: encryptedPayload,
            senderPublicKey,
            recipientSecretKey: keyPair.secretKey
          });

          const blob = new Blob([decryptedBytes], {
            type: encryptedPayload.mimeType || 'application/octet-stream'
          });
          const objectUrl = URL.createObjectURL(blob);
          createdObjectUrlsRef.current.push(objectUrl);

          setMessages((current) => [
            ...current,
            {
              id: `f_${payload.timestamp}_${Math.random().toString(16).slice(2, 8)}`,
              type: 'file',
              senderId: payload.from,
              senderName: encryptedPayload.senderName || payload.from.slice(0, 8),
              timestamp: payload.timestamp,
              outgoing: false,
              file: {
                name: encryptedPayload.name || 'attachment',
                size: encryptedPayload.size,
                mimeType: encryptedPayload.mimeType,
                dataUrl: objectUrl
              }
            }
          ]);
        }
      } catch (_error) {
        setCryptoError('Failed to decrypt one incoming payload');
      }
    };

    socket.on('message:received', onMessageReceived);
    return () => socket.off('message:received', onMessageReceived);
  }, [socket, keyPair?.secretKey, session.publicKeys]);

  useEffect(
    () => () => {
      createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdObjectUrlsRef.current = [];
    },
    []
  );

  useEffect(() => {
    if (!session.endedReason) {
      return;
    }

    createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    createdObjectUrlsRef.current = [];
    setMessages([]);
    setKeyPair({ publicKey: '', secretKey: '' });
  }, [session.endedReason]);

  async function sendText(content) {
    if (!socket || !socket.id || !keyPair.secretKey) {
      return;
    }

    const timestamp = Date.now();
    const plainMessage = {
      type: 'text',
      content,
      senderId: socket.id,
      senderName: identity.displayName,
      timestamp
    };

    const recipients = (session.participants || []).filter(
      (participant) => participant.socketId !== socket.id && participant.publicKey
    );

    recipients.forEach((participant) => {
      const encrypted = encryptTextForRecipient({
        message: plainMessage,
        recipientPublicKey: participant.publicKey,
        senderSecretKey: keyPair.secretKey
      });

      socket.emit('message:send', {
        to: participant.socketId,
        nonce: encrypted.nonce,
        ciphertext: encrypted.ciphertext,
        messageType: 'text'
      });
    });

    setMessages((current) => [
      ...current,
      {
        id: `self_${timestamp}_${Math.random().toString(16).slice(2, 8)}`,
        type: 'text',
        content,
        senderId: socket.id,
        senderName: identity.displayName,
        timestamp,
        outgoing: true
      }
    ]);
  }

  async function sendFile(file) {
    if (!socket || !socket.id || !keyPair.secretKey) {
      return;
    }

    const timestamp = Date.now();
    const arrayBuffer = await file.arrayBuffer();

    const recipients = (session.participants || []).filter(
      (participant) => participant.socketId !== socket.id && participant.publicKey
    );

    recipients.forEach((participant) => {
      const encrypted = encryptFileForRecipient({
        arrayBuffer,
        recipientPublicKey: participant.publicKey,
        senderSecretKey: keyPair.secretKey,
        fileMeta: {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          senderName: identity.displayName,
          timestamp
        }
      });

      socket.emit('message:send', {
        to: participant.socketId,
        nonce: encrypted.payload.fileNonce,
        ciphertext: JSON.stringify(encrypted.payload),
        messageType: 'file'
      });
    });

    const objectUrl = URL.createObjectURL(file);
    createdObjectUrlsRef.current.push(objectUrl);

    setMessages((current) => [
      ...current,
      {
        id: `self_file_${timestamp}_${Math.random().toString(16).slice(2, 8)}`,
        type: 'file',
        senderId: socket.id,
        senderName: identity.displayName,
        timestamp,
        outgoing: true,
        file: {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          dataUrl: objectUrl
        }
      }
    ]);
  }

  function handleNuke() {
    if (!socket || !resolvedSessionId) {
      return;
    }

    socket.emit('session:nuke', { sessionId: resolvedSessionId }, () => { });
  }

  function handleExitRoom() {
    session.leaveSession();
    createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    createdObjectUrlsRef.current = [];
    setMessages([]);
    setKeyPair({ publicKey: '', secretKey: '' });
    setJoinRequested(false);
    navigation.goHome();
  }

  function handleEnterRoom(event) {
    event.preventDefault();
    if (!canEnterRoom) {
      return;
    }

    setJoinRequested(true);
  }

  if (validationLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
        <section className="vault-panel w-full rounded-2xl p-8 text-center">
          <p className="text-sm text-vault-muted">Validating secure session...</p>
        </section>
      </main>
    );
  }

  if (validationError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
        <section className="vault-panel w-full rounded-2xl p-8 text-center">
          <h1 className="text-xl text-vault-danger">Unable to Join Session</h1>
          <p className="mt-3 text-sm text-vault-muted">{validationError}</p>
          <button
            type="button"
            className="mt-6 rounded-lg border border-vault-accent/40 px-4 py-2 text-vault-accent"
            onClick={() => navigation.goHome()}
          >
            Return Home
          </button>
        </section>
      </main>
    );
  }

  if (!session.joined) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="vault-panel w-full overflow-hidden rounded-[32px] p-6 shadow-vault sm:p-8">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">
              Enter room
            </p>
            <h1 className="text-2xl font-semibold text-vault-text sm:text-3xl">Confirm your room identity</h1>
            <p className="max-w-xl text-sm leading-6 text-vault-muted">
              Add the name other participants should see. You will only enter this room after you tap
              {' '}
              <span className="font-medium text-vault-text">Enter room</span>.
            </p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleEnterRoom}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm text-vault-muted">
                Display name
                <input
                  className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
                  value={identity.displayName}
                  onChange={(event) =>
                    setIdentity((current) => ({
                      ...current,
                      displayName: event.target.value
                    }))
                  }
                  maxLength={40}
                  placeholder="Your name"
                />
              </label>

              {requiresPasscode ? (
                <label className="block text-sm text-vault-muted">
                  Passcode (4-8 digits)
                  <input
                    type="password"
                    inputMode="numeric"
                    className="mt-2 w-full rounded-[22px] border border-vault-border bg-white px-4 py-3 text-vault-text outline-none transition focus:border-vault-accent"
                    value={identity.passcode}
                    onChange={(event) =>
                      setIdentity((current) => ({
                        ...current,
                        passcode: event.target.value.replace(/\D/g, '').slice(0, 8)
                      }))
                    }
                    placeholder="Enter passcode"
                  />
                </label>
              ) : (
                <div className="rounded-[24px] border border-vault-border bg-vault-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-vault-muted">Room status</p>
                  <p className="mt-2 text-sm leading-6 text-vault-text">
                    This room does not need a passcode. Your session stays local until you confirm entry.
                  </p>
                </div>
              )}
            </div>

            {session.joinError ? <p className="text-sm text-vault-danger">{session.joinError}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-vault-muted">
                Room ID:
                {' '}
                <span className="break-all font-medium text-vault-text">{resolvedSessionId || sessionRef}</span>
              </p>
              <button
                type="submit"
                className="w-full rounded-full bg-vault-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-vault-accentStrong disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={!canEnterRoom || joinRequested}
              >
                {joinRequested ? 'Entering room...' : 'Enter room'}
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <>
      {session.joinError ? (
        <div className="fixed left-1/2 top-4 z-40 -translate-x-1/2 rounded-lg border border-vault-danger/45 bg-vault-danger/15 px-4 py-2 text-sm text-vault-danger">
          {session.joinError}
        </div>
      ) : null}

      {cryptoError ? (
        <div className="fixed left-1/2 top-16 z-40 -translate-x-1/2 rounded-lg border border-vault-danger/45 bg-vault-danger/15 px-4 py-2 text-sm text-vault-danger">
          {cryptoError}
        </div>
      ) : null}

      {status !== 'connected' ? (
        <div className="fixed left-1/2 top-4 z-40 -translate-x-1/2 rounded-lg border border-vault-accent/45 bg-vault-accent/15 px-4 py-2 text-sm text-vault-accent">
          Socket: {status}
        </div>
      ) : null}

      <ChatRoom
        sessionId={resolvedSessionId}
        shortCode={session.shortCode}
        participants={session.participants}
        selfSocketId={socket?.id}
        messages={messages}
        expiresAt={session.expiresAt}
        isCreator={isCreator}
        onSendText={sendText}
        onSendFile={sendFile}
        onNuke={handleNuke}
        onLeave={handleExitRoom}
        endedReason={session.endedReason}
        qrPayload={initialPayload?.qrPayload || ''}
        entropyString={initialPayload?.entropyString || ''}
      />
    </>
  );
}
