export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = "REQUEST_FAILED",
    readonly correlationId?: string,
    readonly fields: string[] = [],
  ) {
    super(message);
  }
}

export class ResponseValidationError extends Error {
  constructor(
    readonly path: string,
    readonly issues: string[],
  ) {
    super(`The server returned an unexpected response for ${path}`);
  }
}
