import { DateTime } from 'luxon';
import {
  TIMEZONE,
  nowInHospital,
  parseDateAndTime,
  toHospitalDateTime,
  formatToISO,
} from '../lib/time.js';
import { APPOINTMENT_CONFIG } from '../config/constants.js';

/**
 * Generates available 20-minute consultation slots for a doctor on a specific date.
 *
 * Rules:
 * 1. Slot duration: 20 minutes (15 min visit + 5 min buffer).
 * 2. If working window is e.g. 09:00 to 10:50 (110 mins), it creates 5 slots (100 mins) and drops the trailing 10 mins.
 * 3. Slots in the past (before now) are excluded.
 * 4. Slots beyond the 30-day booking window are excluded.
 * 5. Slots overlapping with booked/checked_in appointments are excluded.
 *
 * @param {object} params
 * @param {string} params.dateStr - 'YYYY-MM-DD'
 * @param {Array<{start_time: string, end_time: string}>} params.workingWindows - Working hours
 * @param {Array<{start_time: string|Date, end_time: string|Date}>} params.bookedAppointments - Existing bookings
 * @returns {Array<{startTime: string, endTime: string}>}
 */
export function computeOpenSlots({ dateStr, workingWindows, bookedAppointments = [] }) {
  const now = nowInHospital();
  const maxBookingDate = now.plus({ days: APPOINTMENT_CONFIG.BOOKING_WINDOW_DAYS }).endOf('day');
  const targetDate = DateTime.fromISO(dateStr, { zone: TIMEZONE });

  // If target date is entirely in the past or beyond the 30-day window, return empty
  if (targetDate.endOf('day') < now || targetDate > maxBookingDate) {
    return [];
  }

  const slotDurationMinutes = APPOINTMENT_CONFIG.SLOT_DURATION_MINUTES; // 20
  const openSlots = [];

  // Convert booked appointments to luxon intervals for fast overlap checking
  const bookedIntervals = bookedAppointments.map((appt) => ({
    start: toHospitalDateTime(appt.start_time),
    end: toHospitalDateTime(appt.end_time),
  }));

  for (const window of workingWindows) {
    const windowStart = parseDateAndTime(dateStr, window.start_time);
    const windowEnd = parseDateAndTime(dateStr, window.end_time);

    let currentSlotStart = windowStart;

    while (currentSlotStart.plus({ minutes: slotDurationMinutes }) <= windowEnd) {
      const currentSlotEnd = currentSlotStart.plus({ minutes: slotDurationMinutes });

      // Rule 3: Drop past slots
      const isPast = currentSlotStart <= now;

      // Rule 5: Check if overlaps with any booked appointment
      const hasConflict = bookedIntervals.some(
        (booked) => currentSlotStart < booked.end && currentSlotEnd > booked.start
      );

      if (!isPast && !hasConflict) {
        openSlots.push({
          startTime: formatToISO(currentSlotStart),
          endTime: formatToISO(currentSlotEnd),
        });
      }

      // Advance by exact slot duration
      currentSlotStart = currentSlotEnd;
    }
  }

  return openSlots;
}