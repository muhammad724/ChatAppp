// ============================================================================
// Socket.IO Server Entry Point - Runs as a standalone server
// ============================================================================

import { createServer } from "http";
import { initSocketIO } from "./index";

const PORT = parseInt(process.env.SOCKET_PORT || "3001", 10);
const CORS_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const httpServer = createServer();

// Initialize Socket.IO
const io = initSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[Socket.IO] Server running on port ${PORT}`);
  console.log(`[Socket.IO] CORS origin: ${CORS_ORIGIN}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Socket.IO] Shutting down...");
  io.close(() => {
    httpServer.close();
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("[Socket.IO] Shutting down...");
  io.close(() => {
    httpServer.close();
    process.exit(0);
  });
});

