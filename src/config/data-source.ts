import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { defaultConfig } from "./defaultConfig";
import path from "path";
dotenv.config();

const syncDB = false;
//MySQL database connection
export const AppDataSource = new DataSource({
  type: "mysql",
  host: defaultConfig.database.host,
  port: Number(defaultConfig.database.port),
  username: defaultConfig.database.username,
  password: defaultConfig.database.password,
  database: defaultConfig.database.database,
  entities: syncDB ?  [path.join(__dirname, ".." + "/entities/*.{ts,js}")]: [],
  synchronize: syncDB,
  logging: syncDB,
});

