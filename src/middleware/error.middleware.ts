import { Request, Response, NextFunction } from "express";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[ERROR]", err.message, err.stack);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.APP_ENV === "development" && { stack: err.stack }),
  });
};
