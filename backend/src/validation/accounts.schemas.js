import { z } from 'zod';

export const createDoctorAccountSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    departmentId: z.number().int().positive('Department ID must be a positive integer'),
    specialization: z.string().optional(),
  }),
});

export const createStaffAccountSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['receptionist', 'admin']),
  }),
});

export const updateAccountStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    status: z.enum(['active', 'deactivated']),
  }),
});