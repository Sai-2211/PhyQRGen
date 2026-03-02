import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeSharedSecretsMap } from '../crypto/keyExchange';

export default function useSession({
  socket,
  sessionId,
  displayName,
  passcode,
  creatorSecret,
  keyPair,
  onSessionEnded
}) {
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [participants, setParticipants] = useState([]);
  const [publicKeys, setPublicKeys] = useState({});
  const [expiresAt, setExpiresAt] = useState(null);
  const [creatorSocketId, setCreatorSocketId] = useState(null);
  const [shortCode, setShortCode] = useState('');
  const [endedReason, setEndedReason] = useState(null);

  const sharedSecrets = useMemo(() => {
    if (!socket?.id || !keyPair?.secretKey) {
      return {};
    }

    return computeSharedSecretsMap(publicKeys, socket.id, keyPair.secretKey);
  }, [publicKeys, keyPair?.secretKey, socket?.id]);

  const leaveSession = useCallback(() => {
    if (!socket || !sessionId) {
      return;
    }

    socket.emit('session:leave', { sessionId });
  }, [socket, sessionId]);

  useEffect(() => {
    if (!socket || !sessionId || !keyPair?.publicKey) {
      return undefined;
    }
    setEndedReason(null);

    const onJoined = (payload) => {
      setEndedReason(null);
      setJoined(true);
      setJoinError('');
      setParticipants(payload.participants || []);
      setExpiresAt(payload.expiresAt || null);
      setCreatorSocketId(payload.creatorSocketId || null);
      setShortCode(payload.shortCode || '');
      const map = {};
      (payload.participants || []).forEach((participant) => {
        if (participant?.socketId && participant?.publicKey) {
          map[participant.socketId] = participant.publicKey;
        }
      });
      setPublicKeys(map);
    };

    const onParticipantJoined = (participant) => {
      setParticipants((current) => {
        const withoutDuplicate = current.filter((entry) => entry.socketId !== participant.socketId);
        return [...withoutDuplicate, participant];
      });
      if (participant?.socketId && participant?.publicKey) {
        setPublicKeys((current) => ({ ...current, [participant.socketId]: participant.publicKey }));
      }
    };

    const onParticipantLeft = ({ socketId }) => {
      setParticipants((current) => current.filter((entry) => entry.socketId !== socketId));
      setPublicKeys((current) => {
        const next = { ...current };
        delete next[socketId];
        return next;
      });
    };

    const onKeysUpdated = ({ publicKeys: incoming }) => {
      setPublicKeys(incoming || {});
      setParticipants((current) =>
        current.map((participant) => ({
          ...participant,
          publicKey: incoming?.[participant.socketId] || participant.publicKey || null
        }))
      );
    };

    const onExpired = () => {
      setEndedReason('expired');
      setJoined(false);
      setParticipants([]);
      setPublicKeys({});
      setShortCode('');
      onSessionEnded?.('expired');
    };

    const onNuked = () => {
      setEndedReason('nuked');
      setJoined(false);
      setParticipants([]);
      setPublicKeys({});
      setShortCode('');
      onSessionEnded?.('nuked');
    };

    socket.on('session:joined', onJoined);
    socket.on('session:participant_joined', onParticipantJoined);
    socket.on('session:participant_left', onParticipantLeft);
    socket.on('keys:updated', onKeysUpdated);
    socket.on('session:expired', onExpired);
    socket.on('session:nuked', onNuked);

    socket.emit(
      'session:join',
      {
        sessionId,
        passcode: passcode || undefined,
        displayName: displayName || 'Anonymous',
        publicKey: keyPair.publicKey,
        creatorSecret: creatorSecret || undefined
      },
      (ack) => {
        if (!ack?.ok) {
          setJoinError(ack?.error || 'Unable to join session');
        }
      }
    );

    return () => {
      socket.off('session:joined', onJoined);
      socket.off('session:participant_joined', onParticipantJoined);
      socket.off('session:participant_left', onParticipantLeft);
      socket.off('keys:updated', onKeysUpdated);
      socket.off('session:expired', onExpired);
      socket.off('session:nuked', onNuked);
    };
  }, [
    socket,
    sessionId,
    displayName,
    passcode,
    keyPair?.publicKey,
    creatorSecret,
    onSessionEnded
  ]);

  return {
    joined,
    joinError,
    participants,
    publicKeys,
    sharedSecrets,
    expiresAt,
    creatorSocketId,
    shortCode,
    endedReason,
    leaveSession
  };
}
