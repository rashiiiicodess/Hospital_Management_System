import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

export const setWeeklyTemplateSchema = z.object({
  body: z.object({
    weeklySchedule: z.array(
      z.object({
        dayOfWeek: z.enum([
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
          'sunday',
        ]),
        startTime: z.string().regex(timeRegex, 'Must be valid time (HH:mm or HH:mm:ss)'),
        endTime: z.string().regex(timeRegex, 'Must be valid time (HH:mm or HH:mm:ss)'),
      })
    ),
  }),
});

export const addOverrideSchema = z.object({
  body: z.object({
    overrideDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    isDayOff: z.boolean(),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
  }),
});

export const getSlotsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  }),
});