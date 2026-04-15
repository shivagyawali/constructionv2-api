import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { AppDataSource } from "./config/data-source";
dotenv.config();
// Apply CORS middleware
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
  const corsOptions = {
    origin: "*", 
    credentials: true,
  };  
  app.use(cors(corsOptions));
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
  });
}

startServer();
