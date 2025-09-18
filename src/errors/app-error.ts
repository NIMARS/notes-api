export type ErrorDetails = Record<string, unknown> | undefined;

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;

  constructor(code: string, message: string, statusCode = 400, details?: ErrorDetails) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = 'Bad Request', details?: ErrorDetails) {
    return new AppError('BAD_REQUEST', message, 400, details);
  }

  static unauthorized(message = 'Unauthorized', details?: ErrorDetails) {
    return new AppError('UNAUTHORIZED', message, 401, details);
  }

  static notFound(message = 'Not Found', details?: ErrorDetails) {
    return new AppError('NOT_FOUND', message, 404, details);
  }

  static conflict(message = 'Conflict', details?: ErrorDetails) {
    return new AppError('CONFLICT', message, 409, details);
  }

  toResponse() {
    return { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) };
  }
}
