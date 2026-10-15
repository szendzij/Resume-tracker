import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Error carrying an HTTP status code and a safe, client-facing message.
 * The `message` is the public message surfaced in the JSON body; it never
 * contains internal/DB details.
 */
export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string, options?: { cause?: unknown }) {
    // Standard ES2022 error cause: carries the ORIGINAL rejection so the central
    // error handler can log the real cause without exposing it to the client.
    super(message, { cause: options?.cause });
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown> | unknown;

interface AsyncHandlerOptions {
  statusCode?: number;
  /** Public message returned to the client if the handler rejects. */
  message?: string;
}

/**
 * Wraps an async route handler so any rejected promise is forwarded to
 * `next(err)` instead of becoming an unhandled rejection. When `options.message`
 * is provided, the rejection is converted into an `HttpError` (default 500) so
 * the central error handler can emit the route's original message without
 * leaking internal details.
 */
export function asyncHandler(
  fn: AsyncRequestHandler,
  options?: AsyncHandlerOptions
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err: unknown) => {
      if (options?.message) {
        next(new HttpError(options.statusCode ?? 500, options.message, { cause: err }));
        return;
      }
      next(err);
    });
  };
}
