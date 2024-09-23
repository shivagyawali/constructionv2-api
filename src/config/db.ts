import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { defaultConfig } from "./defaultConfig";

const path = require("path");
dotenv.config();
const syncDB = true;

export const AppDataSource = new DataSource({
  type: "mysql",
  host: defaultConfig.mysql.host,
  port: Number(defaultConfig.mysql.port),
  username: defaultConfig.mysql.username,
  password: defaultConfig.mysql.password,
  database: defaultConfig.mysql.database,
  entities: [path.join(__dirname, "..", "/entity/*.{ts,js}")],
  synchronize: syncDB,
  logging: syncDB,
});
