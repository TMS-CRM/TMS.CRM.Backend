export class HttpErrorResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;

  constructor(
    error: BadRequestError<unknown> | UnauthorizedError<unknown> | ForbiddenError<unknown> | ConflictError<unknown> | InternalError<unknown> | Error,
  ) {
    // If the error is not an instance of HttpError, handle it as an InternalError
    const sanitizedError = error instanceof HttpError ? error : new InternalError('An error occurred');

    this.statusCode = sanitizedError.statusCode;
    this.body = JSON.stringify({
      type: sanitizedError.type,
      message: sanitizedError.message,
      data: sanitizedError.data as Record<string, unknown>,
    });
    this.headers = {
      'Content-Type': 'application/json; charset=utf-8',
    };
  }
}

abstract class HttpError<T> extends Error {
  type: string;
  message: string;
  statusCode: number;
  data: T | null;

  constructor(statusCode: number, type: string, message: string, data?: T) {
    super(message);

    this.type = type;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data ?? null;
  }
}

export class BadRequestError<T> extends HttpError<T> {
  constructor(message: string, data?: T) {
    super(400, 'BadRequestError', message, data);
  }
}

export class UnauthorizedError<T> extends HttpError<T> {
  constructor(message: string, data?: T) {
    super(401, 'UnauthorizedError', message, data);
  }
}

export class ForbiddenError<T> extends HttpError<T> {
  constructor(message: string, data?: T) {
    super(403, 'ForbiddenError', message, data);
  }
}

export class ConflictError<T> extends HttpError<T> {
  constructor(message: string, data?: T) {
    super(409, 'ConflictError', message, data);
  }
}

export class InternalError<T> extends HttpError<T> {
  constructor(message: string, data?: T) {
    super(500, 'InternalError', message, data);
  }
}
