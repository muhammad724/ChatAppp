'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/src/types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    const getToken = (): string | null => {
      const cookies = document.cookie.split('; ');
      const authCookie = cookies.find((c) => c.startsWith('auth_token='));
      return authCookie ? authCookie.split('=')[1] : null;
    };

    const token = getToken();
    if (!token) return;

    const socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
      {
        auth: { token },
        autoConnect,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
      }
    ) as TypedSocket;

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
    });

    if (autoConnect) {
      socketInstance.connect();
    }

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('join_conversation', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('leave_conversation', conversationId);
  }, []);

  const sendMessage = useCallback(
    (data: {
      conversationId: string;
      content: string;
      type: 'text' | 'image' | 'video' | 'file' | 'audio';
      attachments?: {
        url: string;
        type: string;
        name: string;
        size: number;
      }[];
    }) => {
      socketRef.current?.emit('send_message', data);
    },
    []
  );

  const emitTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('typing', conversationId);
  }, []);

  const emitStopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('stop_typing', conversationId);
  }, []);

  const markAsSeen = useCallback(
    (messageId: string, conversationId: string) => {
      socketRef.current?.emit('message_seen', { messageId, conversationId });
    },
    []
  );

  const markAsDelivered = useCallback(
    (messageId: string, conversationId: string) => {
      socketRef.current?.emit('message_delivered', { messageId, conversationId });
    },
    []
  );

  /**
   * Listen for a typed socket event. Returns an unsubscribe function.
   */
  const onEvent = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E]
    ): (() => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};
      
      // Use unknown cast to bypass strict socket.io type checking
      (socket as unknown as { on: (e: string, h: (...args: unknown[]) => void) => void }).on(
        event as string,
        handler as unknown as (...args: unknown[]) => void
      );
      return () => {
        (socket as unknown as { off: (e: string, h: (...args: unknown[]) => void) => void }).off(
          event as string,
          handler as unknown as (...args: unknown[]) => void
        );
      };
    },
    []
  );

  const offEvent = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E]
    ) => {
      const socket = socketRef.current;
      if (!socket) return;
      (socket as unknown as { off: (e: string, h: (...args: unknown[]) => void) => void }).off(
        event as string,
        handler as unknown as (...args: unknown[]) => void
      );
    },
    []
  );

  return {
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    emitTyping,
    emitStopTyping,
    markAsSeen,
    markAsDelivered,
    onEvent,
    offEvent,
  };
}

