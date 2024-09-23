import { Response } from "express";



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
