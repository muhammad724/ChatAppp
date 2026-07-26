import { createServer } from "node:http";
import { Server } from "socket.io";
import { loadConfig } from "./config.js";
import { createServices } from "./lib.js";
import { createApp } from "./app.js";
import { configureSockets } from "./socket.js";

const config = loadConfig();
const services = createServices(config);
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: config.CORS_ORIGINS.split(",").map((value) => value.trim()), credentials: true },
  maxHttpBufferSize: 100_000
});
configureSockets(io, services);
const app = createApp(config, services, io);
httpServer.on("request", app);
httpServer.listen(config.PORT, () => console.log(`Greenline server listening on :${config.PORT}`));

async function shutdown() {
  io.close();
  httpServer.close();
  await services.prisma.$disconnect();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
