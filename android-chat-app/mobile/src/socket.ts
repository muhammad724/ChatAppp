import { io, type Socket } from "socket.io-client";
import { baseUrl } from "./api";

let socket: Socket | null = null;
export function connectSocket(token: string) {
  socket?.disconnect();
  socket = io(baseUrl, { auth: { token }, transports: ["websocket"], reconnection: true });
  return socket;
}
export function getSocket() {
  return socket;
}
