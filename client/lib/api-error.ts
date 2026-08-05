export class ApiError extends Error {
  code?: string;
  customerId?: string;

  constructor(message: string, extra?: { code?: string; customerId?: string }) {
    super(message);
    this.name = "ApiError";
    this.code = extra?.code;
    this.customerId = extra?.customerId;
  }
}
