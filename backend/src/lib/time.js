import { DateTime } from 'luxon';
import { env } from '../config/env.js';

export const TIMEZONE = env.HOSPITAL_TIMEZONE || 'Asia/Kolkata';

/**
 * Returns current DateTime in hospital timezone.
 */
export function nowInHospital() {
  return DateTime.now().setZone(TIMEZONE);
}

/**
 * Parses an ISO string or Date into hospital timezone DateTime.
 */
export function toHospitalDateTime(dateInput) {
  if (dateInput instanceof Date) {
    return DateTime.fromJSDate(dateInput).setZone(TIMEZONE);
  }
  return DateTime.fromISO(dateInput, { zone: TIMEZONE });
}

/**
 * Parses a 'YYYY-MM-DD' date string and 'HH:mm:ss' time string into hospital timezone.
 */
export function parseDateAndTime(dateStr, timeStr) {
  return DateTime.fromISO(`${dateStr}T${timeStr}`, { zone: TIMEZONE });
}

/**
 * Gets lowercase day of week name (e.g. 'monday', 'tuesday').
 */
export function getDayOfWeekName(dateTime) {
  return dateTime.toFormat('cccc').toLowerCase();
}

/**
 * Formats a DateTime to standard ISO string with offset.
 */
export function formatToISO(dateTime) {
  return dateTime.toISO({ suppressMilliseconds: true });
}