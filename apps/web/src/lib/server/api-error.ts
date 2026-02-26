export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, message: string, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      {
        statusCode: error.statusCode,
        error: error.code,
        message: error.message,
      },
      { status: error.statusCode },
    );
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Internal server error';
  return Response.json(
    {
      statusCode: 500,
      error: 'InternalServerError',
      message,
    },
    { status: 500 },
  );
}
