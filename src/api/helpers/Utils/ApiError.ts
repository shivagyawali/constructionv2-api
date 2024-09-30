import { StatusCodes } from "http-status-codes";

export class ApiError extends Error {
  statusCode: number;
  details?: string;

  constructor(statusCode: number, message: string, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}


export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found.") {
    super(StatusCodes.NOT_FOUND, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Access forbidden.") {
    super(StatusCodes.FORBIDDEN, message);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = "Bad request.") {
    super(StatusCodes.BAD_REQUEST, message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized access.") {
    super(StatusCodes.UNAUTHORIZED, message);
  }
}

export class InvalidCredentialsError extends ApiError {
  constructor(message: string = "Invalid credentials.") {
    super(StatusCodes.UNAUTHORIZED, message); // HTTP 401 Unauthorized status
  }
}

