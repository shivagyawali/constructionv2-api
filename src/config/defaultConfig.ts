// src/config.js
const dotenv = require("dotenv");
dotenv.config();

export const defaultConfig = {
  port: process.env.PORT || 4000,
  environment: process.env.APP_ENV || "dev",
  secret: process.env.API_SECRETS || "SECRET_KEY",
  signatureExpiry: process.env.SIGNATURE_EXPIRY || 30,
  mysql: {
    host: process.env.MYSQL_HOST || "localhost",
    port: process.env.MYSQL_PORT || 3306,
    username: process.env.MYSQL_USERNAME || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "constructionms-v2",
  },
};
