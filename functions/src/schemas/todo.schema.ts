import { z } from 'zod';

export const CreateTodoSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional().default(''),
  completed: z.boolean().optional().default(false),
  priority: z.enum(['low', 'medium', 'high'], {
    invalid_type_error: "Priority must be 'low', 'medium', or 'high'"
  }).optional().default('medium'),
  category: z.string().optional().default('general'),
  color: z.string().optional().default('amber'),
  dueDate: z.string().nullable().optional()
});

export const UpdateTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional(),
  color: z.string().optional(),
  dueDate: z.string().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

export const QueryFilterSchema = z.object({
  completed: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export type CreateTodoDTO = z.input<typeof CreateTodoSchema>;
export type CreateTodoOutput = z.infer<typeof CreateTodoSchema>;
export type UpdateTodoDTO = z.infer<typeof UpdateTodoSchema>;
export type QueryFilterDTO = Partial<z.infer<typeof QueryFilterSchema>>;
export type QueryFilterInput = z.input<typeof QueryFilterSchema>;
