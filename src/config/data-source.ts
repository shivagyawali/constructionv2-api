import "reflect-metadata";
import { DataSource } from "typeorm";
import path from "path";
import { env } from "./env";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  entities: [path.join(__dirname, "../entities/**/*.{js,ts}")],
  synchronize: env.isDev,    // auto-sync in dev — use migrations in prod
  logging: env.isDev ? ["error", "warn"] : ["error"],
  extra: {
    connectionLimit: 10,
    connectTimeout: 30000,
    waitForConnections: true,
    queueLimit: 0,
  },
  migrations: [path.join(__dirname, "../migrations/**/*.{js,ts}")],
});
