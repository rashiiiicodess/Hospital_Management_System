import { z } from 'zod';

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.number().int().positive('Doctor ID must be a positive integer'),
    patientId: z.number().int().positive().optional(), // Receptionists can pass patientId; Patients default to self
    startTime: z.string().datetime({ offset: true, message: 'Must be ISO 8601 with timezone offset' }),
    endTime: z.string().datetime({ offset: true, message: 'Must be ISO 8601 with timezone offset' }),
  }),
});

export const cancelAppointmentSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    reason: z.string().optional(),
  }),
});