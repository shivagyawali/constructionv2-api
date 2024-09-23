import dotenv from "dotenv";
import express, { Express, NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import morgan from "morgan";
import path from "path";
import logger from "node-color-log";
import cors from "cors";
import { AppDataSource } from "./src/config/db";
import routes from './src/api/routes'
import { ApiError } from "./src/api/helpers/Utils/ApiError";
dotenv.config();

const app: Express = express();
let isDatabaseConnected = false;

async function initializeApp(): Promise<void> {
  try {
    await AppDataSource.initialize();
    isDatabaseConnected = true;
    logger.success("Connected to the MySQL database");
  } catch (error) {
    console.log(error);

    logger.error("Error connecting to the database:", error);
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  await initializeApp();
  const app = express();

  const port = process.env.PORT || 4000;
  //const swaggerDocument = YAML.load(path.resolve(__dirname, "./swagger.yaml"));
  const corsOptions = {
    origin: ["http://localhost:3000", "http://209.38.0.76"], // Your React app's URLs
    credentials: true, // Enable credentials
  };

  app.use(cors(corsOptions));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(morgan("tiny"));
  // app.use("/api-docs", swaggerUi.serve);
  // app.get("/api-docs", swaggerUi.setup(swaggerDocument));
 const errorHandler = (
   err: ApiError,
   req: Request,
   res: Response,
   next: NextFunction
 ) => {
   const statusCode = err.statusCode || 500;
   res.status(statusCode).json({
     message: err.userMessage || "An unexpected error occurred",
     status: statusCode,
     details: err.details || null,
     stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
   });
 };

  app.use("/api", routes);

  app.get("/api/health-check", (req: Request, res: Response) => {
    const status = isDatabaseConnected ? 200 : 500;
    const message = isDatabaseConnected
      ? "Health check passed"
      : "Health check failed";
    res.status(status).send(message);
  });
  app.use(errorHandler);
  app.listen(port, () => {
    logger.info(`Server is running at port ${port}`);
  });
}

startServer();
