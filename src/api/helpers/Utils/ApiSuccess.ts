class ApiSuccess<T> {
  public readonly statusCode: number;
  public readonly count?: number;
  public readonly data: T;
  public readonly apiType: any;
  public readonly message: string;
  public readonly success: boolean;
  public readonly error: boolean;

  constructor(
    statusCode: number,
    data: T,
    apiType: any,
    message: string = "Success",
    count?: number
  ) {
    this.statusCode = statusCode;
    if (count !== undefined) {
      this.count = count;
    }
    this.apiType = apiType;
    this.message = message;
    this.success = statusCode < 400;
    this.error = statusCode >= 400;
    this.data = data;
  }
}

export { ApiSuccess };
