import { Context } from 'hono';
import { HonoEnv } from '../types/env';
import { UserFirebaseRepository } from '../repositories/user.firebase.repository';
import { TodoFirebaseRepository } from '../repositories/todo.firebase.repository';
import { AuthService } from '../services/auth.service';
import { IAuthService } from '../services/auth.service.interface';
import { RegisterSchema, LoginSchema } from '../schemas/auth.schema';

export class AuthController {
  private customAuthService?: IAuthService;

  constructor(authService?: IAuthService) {
    this.customAuthService = authService;
  }

  private getService(_c: Context<HonoEnv>): IAuthService {
    if (this.customAuthService) {
      return this.customAuthService;
    }
    const userRepo = new UserFirebaseRepository();
    const todoRepo = new TodoFirebaseRepository();
    return new AuthService(userRepo, todoRepo);
  }

  public register = async (c: Context<HonoEnv>): Promise<Response> => {
    const body = await c.req.json().catch(() => ({}));
    const validated = RegisterSchema.parse(body);

    const service = this.getService(c);
    const result = await service.register(validated);

    return c.json(
      {
        success: true,
        data: result,
        message: 'Registrasi berhasil! Selamat datang di Sticky Kanban.'
      },
      201
    );
  };

  public login = async (c: Context<HonoEnv>): Promise<Response> => {
    const body = await c.req.json().catch(() => ({}));
    const validated = LoginSchema.parse(body);

    const service = this.getService(c);
    const result = await service.login(validated);

    return c.json(
      {
        success: true,
        data: result,
        message: 'Login berhasil!'
      },
      200
    );
  };

  public getMe = async (c: Context<HonoEnv>): Promise<Response> => {
    const user = c.get('user');
    if (!user || !user.uid) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        401
      );
    }

    const service = this.getService(c);
    const profile = await service.getMe(user.uid);

    return c.json(
      {
        success: true,
        data: profile
      },
      200
    );
  };
}
