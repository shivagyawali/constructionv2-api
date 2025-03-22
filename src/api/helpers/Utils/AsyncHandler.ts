import { RequestHandler, Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { ApiError } from "./ApiError";

// This asyncHandler wraps the request handlers and automatically catches errors
const asyncHandler = (requestHandler: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // No need for a try-catch here since it will automatically catch async errors
    Promise.resolve(requestHandler(req, res, next)).catch((error: any) => {      
      next(
        new ApiError(
          error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
          error.message || "Internal Server Error",
          error.details || "An unexpected error occurred"
        )
      );
    });
  };
};

export { asyncHandler };
