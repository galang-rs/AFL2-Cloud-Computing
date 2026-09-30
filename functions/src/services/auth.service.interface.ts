import { RegisterDTO, LoginDTO } from '../schemas/auth.schema';
import { UserResponseProfile } from '../models/user.model';

export interface AuthResult {
  user: UserResponseProfile;
  token: string;
  fbIdToken?: string;
  emailVerified?: boolean;
}

export interface IAuthService {
  register(dto: RegisterDTO): Promise<AuthResult>;
  login(dto: LoginDTO): Promise<AuthResult>;
  getMe(uid: string): Promise<UserResponseProfile>;
  checkEmailVerification(email: string, fbIdToken?: string): Promise<boolean>;
  resendVerificationEmail(email: string, fbIdToken?: string): Promise<{ success: boolean; message: string }>;
}
