export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ITodo {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  category?: string;
  color?: string;
  dueDate: string | null;
  createdAt: number;
  updatedAt: number;
}

export class TodoEntity implements ITodo {
  public id: string;
  public userId: string;
  public title: string;
  public description: string;
  public completed: boolean;
  public priority: Priority;
  public category: string;
  public color: string;
  public dueDate: string | null;
  public createdAt: number;
  public updatedAt: number;

  constructor(data: ITodo) {
    this.id = data.id;
    this.userId = data.userId;
    this.title = data.title;
    this.description = data.description || '';
    this.completed = Boolean(data.completed);
    this.priority = data.priority || 'medium';
    this.category = data.category || 'general';
    this.color = data.color || 'amber';
    this.dueDate = data.dueDate || null;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  public toJSON(): ITodo {
    return {
      id: this.id,
      userId: this.userId,
      title: this.title,
      description: this.description,
      completed: this.completed,
      priority: this.priority,
      category: this.category,
      color: this.color,
      dueDate: this.dueDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
