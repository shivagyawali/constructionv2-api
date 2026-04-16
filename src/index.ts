import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { AppDataSource } from "./config/data-source";
import { env } from "./config/env";
import routes from "./routes";
import { notFound, globalErrorHandler } from "./middleware/error.middleware";

const app: Express = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.set("trust proxy", 1);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || env.isDev || env.corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(compression());
app.use(env.isDev ? morgan("dev") : morgan("combined"));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", routes);
app.get("/health", (_: Request, res: Response) =>
  res.json({ status: "ok", env: env.nodeEnv, timestamp: new Date().toISOString() })
);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(globalErrorHandler);

// ─── Bootstrap ────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("✅  Database connected");
  } catch (err: any) {
    console.error("❌  Database connection failed:", err.message);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`🚀  Server running on port ${env.port} [${env.nodeEnv}]`);
    if (env.corsOrigins.length) console.log(`🌐  CORS: ${env.corsOrigins.join(", ")}`);
  });
}

bootstrap();

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(0);
});
process.on("SIGINT", async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  process.exit(0);
});
process.on("unhandledRejection", (reason) => console.error("Unhandled Rejection:", reason));
