import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val && process.env.APP_ENV === "production") {
    console.warn(`⚠️  Missing env var: ${key}`);
  }
  return val ?? "";
}

function optional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  port:    Number(optional("PORT", "4000")),
  nodeEnv: optional("APP_ENV", "dev"),
  isDev:   optional("APP_ENV", "dev") === "dev",
  isProd:  optional("APP_ENV", "dev") === "production",

  corsOrigins: optional("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
    .split(",").map(o => o.trim()).filter(Boolean),

  jwt: {
    secret:           optional("JWT_SECRET", "dev-secret-change-in-production"),
    expiresIn:        optional("JWT_EXPIRES_IN", "7d"),
    refreshSecret:    optional("JWT_REFRESH_SECRET", "dev-refresh-secret-change-in-production"),
    refreshExpiresIn: optional("JWT_REFRESH_EXPIRES_IN", "30d"),
  },

  db: {
    host:     optional("MYSQL_HOST", "localhost"),
    port:     Number(optional("MYSQL_PORT", "3306")),
    username: optional("MYSQL_USERNAME", "root"),
    password: optional("MYSQL_PASSWORD", ""),
    database: optional("MYSQL_DATABASE", "buildersoft"),
  },
};
