/** Einheitliches Fehlerformat fuer die gesamte API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function jsonResponse(
  body: unknown, status = 200, headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      ...headers,
    },
  });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return jsonResponse({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    }, err.status);
  }
  // Interne Fehler nie nach aussen durchreichen.
  return jsonResponse({
    error: { code: 'internal_error', message: 'Unerwarteter Fehler' },
  }, 500);
}

export const badRequest = (message: string): Response =>
  errorResponse(new ApiError(400, 'invalid_request', message));

export const notFound = (message: string): Response =>
  errorResponse(new ApiError(404, 'not_found', message));
