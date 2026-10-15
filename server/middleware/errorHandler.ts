import { NextFunction, Request, Response } from 'express';
import { HttpError } from './asyncHandler';

const GENERIC_MESSAGE = 'Wewnętrzny błąd serwera';

/**
 * Centralny middleware błędów. Express rozpoznaje error handler wyłącznie po
 * arności (4 argumenty), dlatego NIE skracamy listy parametrów.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode =
    err instanceof HttpError ? err.statusCode : 500;

  // Only expose the message for controlled HttpErrors; unknown errors get a
  // generic message so no internal/DB details or stack traces leak.
  const message = err instanceof HttpError ? err.message : GENERIC_MESSAGE;

  // Log once, server-side only. When the error is a controlled HttpError that
  // wraps the original rejection (asyncHandler sets `cause`), surface the REAL
  // cause too, otherwise the diagnosable root cause would be lost.
  if (err instanceof HttpError && err.cause !== undefined) {
    console.error('Request error:', err.message, err.cause);
  } else {
    console.error('Unhandled request error:', err);
  }

  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json({ error: message });
}
