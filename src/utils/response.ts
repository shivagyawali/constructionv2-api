import { Response } from "express";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, any>;
  errors?: any;
}

export const sendSuccess = (res: Response, data: any, message = "Success", statusCode = 200, meta?: object) => {
  const payload: ApiResponse = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

export const sendCreated = (res: Response, data: any, message = "Created successfully") =>
  sendSuccess(res, data, message, 201);

export const sendError = (res: Response, message: string, statusCode = 400, errors?: any) => {
  const payload: ApiResponse = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

export const sendPaginated = (res: Response, data: any[], total: number, limit: number, offset: number, message = "Success") =>
  sendSuccess(res, data, message, 200, {
    total, limit, offset,
    pages: Math.ceil(total / limit),
    currentPage: Math.floor(offset / limit) + 1,
  });

// Aliases for backward compat
export const success = sendSuccess;
export const created = sendCreated;
export const error = sendError;
export const paginate = sendPaginated;
