import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function useSocket() {
  const socketRef = useRef(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 800
    });

    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('reconnect_attempt', () => setStatus('connecting'));
    socket.on('connect_error', () => setStatus('error'));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    socket: socketRef.current,
    status
  };
}
