import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { AppDataSource } from "./config/data-source";
import routes from "./routes/index";

const app = express();
const PORT = process.env.PORT || 4000;   // ← updated to match your .env

// ── Load Allowed Origins from .env (best practice) ───────────────
const corsOriginsEnv = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : [
      "https://cms.buildersoft.ca",
      process.env.APP_URL || "http://localhost:3000",   // ← uses your APP_URL
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      // You can add more here if needed
    ];

// ── Security & Utilities ─────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Debug log (remove after you confirm it's working)
      console.log("📡 Request Origin received:", origin);

      if (!origin || corsOriginsEnv.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`❌ CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Rate Limiting ─────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests, please try again later." },
}));

// ── Body Parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Error]", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ── Bootstrap ─────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connected");

    app.listen(PORT, () => {
      console.log(`🚀 Buildersoft API running at http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
      console.log(`✅ Allowed CORS origins:`, corsOriginsEnv);
    });
  } catch (err) {
    console.error("❌ Failed to start:", err);
    process.exit(1);
  }
}

bootstrap();