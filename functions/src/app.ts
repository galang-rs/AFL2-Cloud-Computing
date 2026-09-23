import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HonoEnv } from './types/env';
import { authRouter } from './routes/auth.routes';
import { todoRouter } from './routes/todo.routes';
import { ErrorMiddleware } from './middlewares/error.middleware';

export function createApp() {
  const app = new Hono<HonoEnv>();

  // Global CORS middleware
  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  // Health check endpoint
  app.get('/health', (c) => {
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'afl2-todo-backend-firebase',
      version: '1.0.0'
    });
  });

  // Mount auth routes
  app.route('/api/auth', authRouter);
  app.route('/auth', authRouter);

  // Mount todo routes at /api/todos and /todos
  app.route('/api/todos', todoRouter);
  app.route('/todos', todoRouter);

  // Global Error & Not Found Handlers
  app.onError((err, c) => ErrorMiddleware.handle(err, c));
  app.notFound((c) => ErrorMiddleware.handleNotFound(c));

  return app;
}
