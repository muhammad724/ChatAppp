import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import type { Server } from "socket.io";
import type { Config } from "./config.js";
import type { Services } from "./lib.js";
import { authenticate } from "./auth.js";
import { createRoutes } from "./routes.js";
import { errorHandler, notFound } from "./errors.js";

export function createApp(config: Config, services: Services, io: Server) {
  const app = express();
  const origins = config.CORS_ORIGINS.split(",").map((value) => value.trim());
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) =>
      !origin || origins.includes(origin) ? callback(null, true) : callback(new Error("Origin is not allowed")),
    credentials: true
  }));
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", authenticate(services), createRoutes(services, config, io));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
