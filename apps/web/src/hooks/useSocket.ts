'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

interface UseSocketOptions {
  autoConnect?: boolean;
}

export const useSocket = (options: UseSocketOptions = {}): { socket: Socket | null } => {
  const { autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const { tokens, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !tokens?.accessToken || !autoConnect) return;

    const socket = connectSocket(tokens.accessToken);
    socketRef.current = socket;

    socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT);
      socket.off(SOCKET_EVENTS.DISCONNECT);
      socket.off(SOCKET_EVENTS.CONNECT_ERROR);
    };
  }, [isAuthenticated, tokens?.accessToken, autoConnect]);

  return { socket: socketRef.current };
};

interface UseSocketEventOptions<T> {
  event: string;
  handler: (data: T) => void;
  enabled?: boolean;
}

export const useSocketEvent = <T>({
  event,
  handler,
  enabled = true,
}: UseSocketEventOptions<T>): void => {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();
    const wrappedHandler = (data: T) => handlerRef.current(data);

    socket.on(event, wrappedHandler);
    return () => {
      socket.off(event, wrappedHandler);
    };
  }, [event, enabled]);
};

export const useSocketEmit = () => {
  const emit = useCallback(<T>(event: string, data?: T) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit – not connected:', event);
    }
  }, []);

  return { emit };
};
