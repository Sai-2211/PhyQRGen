import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';

export default function useWebRTC({ socket, selfSocketId, participantIds, sessionEnded }) {
  const peersRef = useRef(new Map());
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [callMode, setCallMode] = useState(null);

  const cleanupPeer = useCallback((peerId) => {
    const peer = peersRef.current.get(peerId);
    if (!peer) {
      return;
    }

    peer.removeAllListeners();
    peer.destroy();
    peersRef.current.delete(peerId);
    setRemoteStreams((current) => {
      const next = { ...current };
      delete next[peerId];
      return next;
    });
  }, []);

  const destroyAll = useCallback(() => {
    Array.from(peersRef.current.keys()).forEach((peerId) => cleanupPeer(peerId));
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);
    setRemoteStreams({});
    setCallMode(null);
  }, [cleanupPeer, localStream]);

  const createPeer = useCallback(
    (peerId, initiator, stream) => {
      if (!socket || !peerId || peersRef.current.has(peerId)) {
        return peersRef.current.get(peerId) || null;
      }

      const peer = new Peer({
        initiator,
        trickle: true,
        stream
      });

      peer.on('signal', (signal) => {
        socket.emit('webrtc:signal', {
          to: peerId,
          signal
        });
      });

      peer.on('stream', (incoming) => {
        setRemoteStreams((current) => ({
          ...current,
          [peerId]: incoming
        }));
      });

      peer.on('close', () => cleanupPeer(peerId));
      peer.on('error', () => cleanupPeer(peerId));

      peersRef.current.set(peerId, peer);
      return peer;
    },
    [socket, cleanupPeer]
  );

  const syncPeersForParticipants = useCallback(
    (stream) => {
      if (!socket || !selfSocketId) {
        return;
      }

      (participantIds || [])
        .filter((id) => id && id !== selfSocketId)
        .forEach((peerId) => {
          if (peersRef.current.has(peerId)) {
            return;
          }

          const initiator = selfSocketId.localeCompare(peerId) < 0;
          createPeer(peerId, initiator, stream);
        });

      Array.from(peersRef.current.keys()).forEach((peerId) => {
        if (!(participantIds || []).includes(peerId)) {
          cleanupPeer(peerId);
        }
      });
    },
    [socket, selfSocketId, participantIds, createPeer, cleanupPeer]
  );

  const startCall = useCallback(
    async (mode) => {
      if (!navigator.mediaDevices) {
        throw new Error('Media devices API not available');
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      let stream;
      if (mode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: mode === 'video',
          audio: true
        });
      }

      setLocalStream(stream);
      setCallMode(mode);
      syncPeersForParticipants(stream);
    },
    [localStream, syncPeersForParticipants]
  );

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const onSignal = ({ from, signal }) => {
      const existing = peersRef.current.get(from);
      const peer = existing || createPeer(from, false, localStream || undefined);
      if (peer) {
        peer.signal(signal);
      }
    };

    socket.on('webrtc:signal', onSignal);
    return () => socket.off('webrtc:signal', onSignal);
  }, [socket, createPeer, localStream]);

  useEffect(() => {
    if (!localStream) {
      return;
    }

    syncPeersForParticipants(localStream);
  }, [localStream, syncPeersForParticipants]);

  useEffect(() => {
    if (sessionEnded) {
      destroyAll();
    }
  }, [sessionEnded, destroyAll]);

  useEffect(() => () => destroyAll(), [destroyAll]);

  return {
    localStream,
    remoteStreams,
    callMode,
    startCall,
    endCall: destroyAll
  };
}
