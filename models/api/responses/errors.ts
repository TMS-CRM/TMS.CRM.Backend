export class HttpErrorResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;

  constructor(error: BadRequestError | UnauthorizedError | ConflictError | InternalError | Error) {
    // If the error is not an instance of HttpError, handle it as an InternalError
    const sanitizedError = error instanceof HttpError ? error : new InternalError('An error occurred');

    this.statusCode = sanitizedError.statusCode;
    this.body = JSON.stringify({
      type: sanitizedError.type,
      message: sanitizedError.message,
    });
    this.headers = {
      'Content-Type': 'application/json; charset=utf-8',
    };
  }
}

abstract class HttpError extends Error {
  type: string;
  message: string;
  statusCode: number;

  constructor(statusCode: number, type: string, message: string) {
    super(message);

    this.type = type;
    this.message = message;
    this.statusCode = statusCode;
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(400, 'BadRequestError', message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(401, 'UnauthorizedError', message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, 'ConflictError', message);
  }
}

export class InternalError extends HttpError {
  constructor(message: string) {
    super(500, 'InternalError', message);
  }
}
