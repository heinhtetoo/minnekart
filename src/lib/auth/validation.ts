import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,30}$/);

export const passwordSchema = z.string().min(8).max(100);

export const signupSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  name: z.string().trim().min(1).max(80),
  password: passwordSchema,
  invite: z.string().min(1),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(100),
});

export const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
