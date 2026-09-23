import { ITodo } from '../models/todo.model';
import { CreateTodoDTO, UpdateTodoDTO, QueryFilterDTO } from '../schemas/todo.schema';

export interface ITodoService {
  createTodo(userId: string, dto: CreateTodoDTO): Promise<ITodo>;
  getTodos(userId: string, filter?: QueryFilterDTO): Promise<ITodo[]>;
  getTodoById(userId: string, id: string): Promise<ITodo>;
  updateTodo(userId: string, id: string, dto: UpdateTodoDTO): Promise<ITodo>;
  deleteTodo(userId: string, id: string): Promise<void>;
}
