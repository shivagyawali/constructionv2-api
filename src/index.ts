import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { AppDataSource } from "./config/data-source";

dotenv.config();

const app: Express = express();
let isDatabaseConnected = false;

async function initializeApp(): Promise<void> {
  try {
    await AppDataSource.initialize();
    isDatabaseConnected = true;
    console.log("Connected to the MySQL database");
  } catch (error) {
    console.log("Error connecting to the database:", error);
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  await initializeApp();

  const port = process.env.PORT || 4000;

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000", "http://localhost:5173", "https://cms.buildersoft.ca"];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked request from origin: ${origin}`);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400, // Cache preflight response for 24 hours
  };

  // Apply CORS middleware globally
  app.use(cors(corsOptions));

  // Explicitly handle preflight OPTIONS requests for all routes
  app.options("*", cors(corsOptions));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(morgan("tiny"));
  app.use("/api", routes);

  app.get("/health-check", (req: Request, res: Response) => {
    const status = isDatabaseConnected ? 200 : 500;
    const message = isDatabaseConnected
      ? "Health check passed"
      : "Health check failed";
    res.status(status).send(message);
  });

  app.listen(port, () => {
    console.log(`Server is running at port ${port}`);
    console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
  });
}

startServer();