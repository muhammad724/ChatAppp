// ============================================================================
// Socket.IO Client Library
// ============================================================================

import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/src/types";

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: TypedSocket | null = null;

/**
 * Get or create a Socket.IO client instance
 */
export function getSocket(): TypedSocket | null {
  return socketInstance;
}

/**
 * Initialize Socket.IO client connection
 */
export function initSocket(token: string): TypedSocket {
  if (socketInstance?.connected) {
    return socketInstance;
  }

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

  socketInstance = io(socketUrl, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  }) as TypedSocket;

  socketInstance.on("connect", () => {
    console.log("[Socket] Connected:", socketInstance?.id);
  });

  socketInstance.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
  });

  socketInstance.on("connect_error", (error) => {
    console.error("[Socket] Connection error:", error.message);
  });

  return socketInstance;
}

/**
 * Disconnect Socket.IO client
 */
export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

