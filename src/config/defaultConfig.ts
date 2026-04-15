import dotenv from "dotenv";

dotenv.config();

export const defaultConfig = {
  app: {
    port: Number(process.env.PORT) || 4000,
    env: process.env.APP_ENV || "dev",
    url: process.env.APP_URL || "",
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",")
      : [],
  },

  auth: {
    apiSecrets: process.env.API_SECRETS || "",
    signatureExpiry: Number(process.env.SIGNATURE_EXPIRY) || 30,

    jwt: {
      secret: process.env.JWT_SECRET || "",
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      refreshSecret: process.env.JWT_REFRESH_SECRET || "",
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
    },
  },

  database: {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT) || 3306,
    username: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  },

  mail: {
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    sender: process.env.MAIL_SENDER,
  },
};