import { Response } from "express";

export const success = (
  res: Response,
  data: any,
  message = "Success",
  statusCode = 200,
  meta?: object
) => {
  const payload: any = { success: true, message, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

export const created = (res: Response, data: any, message = "Created successfully") =>
  success(res, data, message, 201);

export const error = (res: Response, message: string, statusCode = 400, errors?: any) => {
  const payload: any = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

export const paginate = (
  res: Response,
  data: any[],
  total: number,
  limit: number,
  offset: number,
  message = "Success"
) =>
  success(res, data, message, 200, {
    total,
    limit,
    offset,
    pages: Math.ceil(total / limit),
    currentPage: Math.floor(offset / limit) + 1,
  });
