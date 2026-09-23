import { Context } from 'hono';
import { ZodError } from 'zod';
import { AppError } from '../services/todo.service';
import { HonoEnv } from '../types/env';

export class ErrorMiddleware {
  public static handle(err: Error, c: Context<HonoEnv>): Response {
    console.error('Unhandled Application Error:', err);

    if (err instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data provided',
            details: err.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message
            }))
          }
        },
        400
      );
    }

    if (err instanceof AppError) {
      return c.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            ...(err.details ? { details: err.details } : {})
          }
        },
        err.statusCode as any
      );
    }

    if (err.name === 'SyntaxError') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Malformed JSON payload in request body'
          }
        },
        400
      );
    }

    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'An unexpected internal server error occurred'
        }
      },
      500
    );
  }

  public static handleNotFound(c: Context<HonoEnv>): Response {
    return c.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${c.req.method} ${c.req.path} not found`
        }
      },
      404
    );
  }
}
