import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) return socket;

  const url = import.meta.env.VITE_SOCKET_URL || '';

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect',         () => console.log('[Socket] 연결됨'));
  socket.on('disconnect',      () => console.log('[Socket] 연결 끊김'));
  socket.on('connect_error',   (e) => console.error('[Socket] 연결 오류:', e.message));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
