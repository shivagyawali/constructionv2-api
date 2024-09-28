import { Response } from "express";
import { ApiError } from "./ApiError";



export const sendSuccessResponse = (
  res: Response,
  message: string,
  statusCode: number,
  data: any
) => {
  res.status(statusCode).json({
    message,
    statusCode,
    data,
  });
};

export const sendErrorResponse = (
  res: Response,
  statusCode: number,
  errorCode: string,
  message: string
) => {
  const errorResponse = new ApiError(message, statusCode, errorCode);
  res.status(statusCode).json({
    error: errorResponse,
  });
};

