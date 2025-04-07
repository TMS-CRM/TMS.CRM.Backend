export class HttpOkResponse<T> {
  statusCode: number;
  body: string;
  headers: Record<string, string>;

  constructor(result: FetchSuccess<T> | PersistSuccess<T> | DeleteSuccess<T>) {
    this.statusCode = result.statusCode;
    this.body = JSON.stringify({
      type: result.type,
      message: result.message,
      data: result.data,
    });
    this.headers = {
      'Content-Type': 'application/json; charset=utf-8',
    };
  }
}

abstract class Success<T> {
  type: string;
  message: string;
  statusCode: number;
  data: T | null;

  constructor(type: string, message?: string, data?: T) {
    this.type = type;
    this.message = message ?? '';
    this.statusCode = !data ? 204 : 200;
    this.data = data ?? null;
  }
}

// As API response when fetching data
export class FetchSuccess<T> extends Success<T> {
  constructor(message?: string, data?: T) {
    super('FetchSuccess', message, data);
  }
}

// As API response when deleting data
export class DeleteSuccess<T> extends Success<T> {
  constructor(message?: string, data?: T) {
    super('DeleteSuccess', message, data);
  }
}

// As API response when persisting data
export class PersistSuccess<T> extends Success<T> {
  constructor(message?: string, data?: T) {
    super('PersistSuccess', message, data);
  }
}
