export class ApiError extends Error {
  public statusCode: number;
  public details: any;

  constructor(
    message: string,
    statusCode: number,
    public userMessage: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;

    // Set the prototype explicitly to maintain correct instanceof behavior
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
