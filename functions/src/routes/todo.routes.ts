import { Hono } from 'hono';
import { HonoEnv } from '../types/env';
import { TodoController } from '../controllers/todo.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const todoRouter = new Hono<HonoEnv>();
const todoController = new TodoController();

// All todo routes require authentication
todoRouter.use('*', authMiddleware);

todoRouter.post('/', (c) => todoController.create(c));
todoRouter.get('/', (c) => todoController.getAll(c));
todoRouter.get('/:id', (c) => todoController.getById(c));
todoRouter.put('/:id', (c) => todoController.update(c));
todoRouter.patch('/:id', (c) => todoController.update(c));
todoRouter.delete('/:id', (c) => todoController.delete(c));
