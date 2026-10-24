import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response has already started streaming, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Zod validation errors -> 400 Bad Request
  if (err instanceof ZodError) {
    const formatted = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      error: 'Invalid request payload or parameters.',
      code: 'VALIDATION_ERROR',
      details: formatted,
    });
    return;
  }

  // 2. Multer file upload errors -> 400 Bad Request
  if (err.name === 'MulterError') {
    res.status(400).json({
      error: `File upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
    });
    return;
  }

  // 3. Known HTTP status errors
  const status = Number.isInteger(err.status || err.statusCode) ? (err.status || err.statusCode) : 500;

  if (env.NODE_ENV !== 'production' && env.NODE_ENV !== 'test') {
    console.error(`[Server Error] ${req.method} ${req.url}:`, err);
  }

  res.status(status).json({
    error: status === 500 && env.NODE_ENV === 'production' 
      ? 'An unexpected municipal server error occurred. Please try again later.'
      : err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
}
