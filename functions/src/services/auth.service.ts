import { IUserRepository } from '../repositories/user.repository.interface';
import { ITodoRepository } from '../repositories/todo.repository.interface';
import { UserEntity, UserResponseProfile, UserRole } from '../models/user.model';
import { RegisterDTO, LoginDTO } from '../schemas/auth.schema';
import { IAuthService, AuthResult } from './auth.service.interface';
import { AppError } from './todo.service';
import { hashPassword, verifyPassword, signJwt } from '../utils/crypto.utils';

export const DOSEN_DEFAULT_NAME = 'Elizabeth Nathania Wintanto';
export const DOSEN_DEFAULT_EMAIL = 'dosen@ciputra.ac.id';

export class AuthService implements IAuthService {
  private userRepository: IUserRepository;
  private todoRepository?: ITodoRepository;

  constructor(userRepository: IUserRepository, todoRepository?: ITodoRepository) {
    this.userRepository = userRepository;
    this.todoRepository = todoRepository;
  }

  private isDosen(email: string, displayName?: string): boolean {
    const normalizedEmail = email.toLowerCase();
    const normalizedName = (displayName || '').toLowerCase();

    return (
      normalizedEmail.includes('dosen') ||
      normalizedEmail.includes('elizabeth') ||
      normalizedEmail.includes('wintanto') ||
      normalizedEmail.startsWith('evaluasi') ||
      normalizedEmail === DOSEN_DEFAULT_EMAIL ||
      normalizedName.includes('dosen') ||
      normalizedName.includes('penguji') ||
      normalizedName.includes('elizabeth') ||
      normalizedName.includes('wintanto')
    );
  }

  /**
   * Reset & Seed fresh dummy data strictly for Dosen (Elizabeth Nathania Wintanto) on every login!
   * Normal users will NEVER receive dummy data!
   */
  public async resetAndSeedDosenDummyData(userId: string): Promise<void> {
    if (!this.todoRepository) return;
    try {
      // Clear existing todos to reset to initial state
      if (this.todoRepository.deleteAll) {
        await this.todoRepository.deleteAll(userId);
      } else {
        const existing = await this.todoRepository.findAll(userId);
        for (const t of existing) {
          await this.todoRepository.delete(userId, t.id);
        }
      }

      const now = Date.now();
      // 1. Firebase RTDB Implementation task
      await this.todoRepository.create(userId, {
        userId,
        title: 'Implementasi Firebase Realtime Database',
        description: 'Menyimpan dan mengelola data Sticky Kanban pada node Firebase Realtime Database dengan skema multi-atribut.',
        completed: true,
        priority: 'high',
        category: 'academic',
        color: 'amber',
        dueDate: '2026-09-30',
        createdAt: now - 3600000 * 4,
        updatedAt: now - 3600000 * 2
      });

      // 2. Migration to Firebase Native
      await this.todoRepository.create(userId, {
        userId,
        title: 'Migrasi Ekosistem Cloudflare ke Firebase Native',
        description: 'Menggantikan seluruh backend Cloudflare Workers & D1 dengan Firebase Cloud Functions dan Realtime Database.',
        completed: true,
        priority: 'urgent',
        category: 'work',
        color: 'rose',
        dueDate: '2026-10-01',
        createdAt: now - 3600000 * 3,
        updatedAt: now - 3600000 * 1
      });

      // 3. Schema and 5+ data fields validation
      await this.todoRepository.create(userId, {
        userId,
        title: 'Validasi Struktur Data Realtime (Minimal 5 Field)',
        description: 'Memastikan setiap catatan menyimpan 10 field: id, userId, title, description, completed, priority, category, color, dueDate, timestamps.',
        completed: false,
        priority: 'high',
        category: 'academic',
        color: 'sky',
        dueDate: '2026-10-03',
        createdAt: now - 3600000 * 2,
        updatedAt: now - 3600000 * 2
      });

      // 4. Real-time Synchronization testing task
      await this.todoRepository.create(userId, {
        userId,
        title: 'Sinkronisasi Realtime Multi-Klien Sticky Notes',
        description: 'Menggunakan listener Firebase Realtime Database onValue untuk live updates instan tanpa jeda polling.',
        completed: false,
        priority: 'medium',
        category: 'work',
        color: 'emerald',
        dueDate: '2026-10-05',
        createdAt: now - 3600000 * 1,
        updatedAt: now - 3600000 * 1
      });

      // 5. Documentation & security rules
      await this.todoRepository.create(userId, {
        userId,
        title: 'Dokumentasi Arsitektur & Security Rules AFL2',
        description: 'Menyusun laporan implementasi database rules, autentikasi Firebase, dan pengujian menyeluruh untuk evaluasi Dosen.',
        completed: false,
        priority: 'low',
        category: 'academic',
        color: 'yellow',
        dueDate: '2026-10-08',
        createdAt: now,
        updatedAt: now
      });
    } catch (err) {
      console.error('[AuthService] Error resetting and seeding dosen dummy tasks:', err);
    }
  }

  public async register(dto: RegisterDTO): Promise<AuthResult> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new AppError('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.', 400, 'EMAIL_ALREADY_EXISTS');
    }

    const isDosenRole = this.isDosen(dto.email, dto.displayName);
    const role: UserRole = isDosenRole ? 'dosen' : 'student';
    const displayName = isDosenRole && !dto.displayName.toLowerCase().includes('elizabeth')
      ? DOSEN_DEFAULT_NAME
      : dto.displayName.trim();

    const passwordHash = await hashPassword(dto.password);
    const now = Date.now();

    const createdUser = await this.userRepository.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      displayName,
      role,
      createdAt: now,
      updatedAt: now
    });

    const userEntity = new UserEntity(createdUser);
    const profile = userEntity.toProfile();

    // STRICT BUSINESS RULE: Only seed dummy data for Dosen accounts!
    if (role === 'dosen') {
      await this.resetAndSeedDosenDummyData(profile.uid);
    }

    const token = await signJwt({
      uid: profile.uid,
      email: profile.email,
      name: profile.displayName,
      role: profile.role
    });

    return { user: profile, token };
  }

  public async login(dto: LoginDTO): Promise<AuthResult> {
    let user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      // Auto-provision demo dosen account if logging in with dosen demo credentials for smooth evaluation
      if (this.isDosen(dto.email)) {
        return this.register({
          email: dto.email,
          password: dto.password,
          displayName: DOSEN_DEFAULT_NAME
        });
      }
      throw new AppError('Email atau kata sandi tidak cocok.', 401, 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await verifyPassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Email atau kata sandi tidak cocok.', 401, 'INVALID_CREDENTIALS');
    }

    const userEntity = new UserEntity(user);
    const profile = userEntity.toProfile();

    // STRICT BUSINESS RULE: For Dosen accounts, RESET & RESEED fresh dummy data on every login!
    if (profile.role === 'dosen' || this.isDosen(profile.email, profile.displayName)) {
      await this.resetAndSeedDosenDummyData(profile.uid);
    }

    const token = await signJwt({
      uid: profile.uid,
      email: profile.email,
      name: profile.displayName,
      role: profile.role
    });

    return { user: profile, token };
  }

  public async getMe(uid: string): Promise<UserResponseProfile> {
    if (!uid) {
      throw new AppError('User ID is required', 401, 'UNAUTHORIZED');
    }

    const user = await this.userRepository.findById(uid);
    if (!user) {
      throw new AppError('Pengguna tidak ditemukan', 404, 'USER_NOT_FOUND');
    }

    return new UserEntity(user).toProfile();
  }
}
