import { Request, Response, NextFunction } from "express";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};

export const globalErrorHandler = (
  err: any, _req: Request, res: Response, _next: NextFunction
) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (process.env.APP_ENV !== "production") {
    console.error("[ERROR]", err);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.APP_ENV !== "production" && { stack: err.stack }),
  });
};
