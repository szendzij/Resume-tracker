import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Express middleware to validate req.body against a Zod schema.
 * Responds with HTTP 400 and structured error details on validation failure.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues || [];
      const details = issues.map((issue) => {
        const path = issue.path.join('.') || 'body';
        return `${path}: ${issue.message}`;
      });

      res.status(400).json({
        error: 'Nieprawidłowe dane wejściowe',
        details,
        issues,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

export const validate = validateBody;
