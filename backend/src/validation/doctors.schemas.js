import { z } from 'zod';

export const updateDoctorSelfSchema = z.object({
  body: z.object({
    bio: z.string().optional(),
    qualifications: z.string().optional(),
    experienceYears: z.number().int().min(0).max(70).optional(),
    languages: z.string().optional(),
  }),
});

export const updateDoctorAdminSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    departmentId: z.number().int().positive().optional(),
    specialization: z.string().min(2).optional(),
  }),
});