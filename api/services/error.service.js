export class AppError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  constructor(message, code) {
    super(message, code, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message, code) {
    super(message, code, 401);
    this.name = 'AuthenticationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message, code) {
    super(message, code, 404);
    this.name = 'NotFoundError';
  }
}

export function handleError(error, logger) {
  if (error instanceof AppError) {
    logger.error({
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode
    }, error.message);
    return {
      error: error.code,
      message: error.message,
      statusCode: error.statusCode
    };
  }

  logger.error({ err: error }, 'Unhandled error');
  return {
    error: 'internal_error',
    message: '服务器内部错误',
    statusCode: 500
  };
}