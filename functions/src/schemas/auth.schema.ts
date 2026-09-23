import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z
    .string({ required_error: 'Alamat email wajib diisi' })
    .trim()
    .email('Format email tidak valid'),
  password: z
    .string({ required_error: 'Kata sandi wajib diisi' })
    .min(6, 'Kata sandi minimal 6 karakter'),
  displayName: z
    .string({ required_error: 'Nama lengkap wajib diisi' })
    .trim()
    .min(1, 'Nama lengkap wajib diisi')
    .max(100, 'Nama lengkap maksimal 100 karakter')
});

export const LoginSchema = z.object({
  email: z
    .string({ required_error: 'Alamat email wajib diisi' })
    .trim()
    .email('Format email tidak valid'),
  password: z
    .string({ required_error: 'Kata sandi wajib diisi' })
    .min(1, 'Kata sandi wajib diisi')
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;
export type LoginDTO = z.infer<typeof LoginSchema>;
