import { pool, withTransaction } from '../db/pool.js';
import * as availabilityQueries from '../db/queries/availability.queries.js';
import { computeOpenSlots } from './slots.service.js';
import { parseDateAndTime, getDayOfWeekName } from '../lib/time.js';
import { NotFoundError } from '../errors/AppError.js';

export async function setWeeklyTemplate(doctorId, weeklySchedule) {
  return withTransaction(async (client) => {
    return availabilityQueries.replaceWeeklyTemplate(client, doctorId, weeklySchedule);
  });
}

export async function addOverride(doctorId, overrideData) {
  return withTransaction(async (client) => {
    return availabilityQueries.addDateOverride(client, {
      doctorId,
      ...overrideData,
    });
  });
}

export async function getDoctorSlots(doctorId, dateStr) {
  // 1. Check if doctor has a date override on dateStr
  const override = await availabilityQueries.getOverrideForDate(pool, doctorId, dateStr);

  let workingWindows = [];

  if (override) {
    if (override.is_day_off) {
      // Doctor took day off on this date
      return [];
    }
    workingWindows.push({
      start_time: override.start_time,
      end_time: override.end_time,
    });
  } else {
    // 2. Otherwise, check doctor's weekly template for day of week
    const targetDayName = getDayOfWeekName(parseDateAndTime(dateStr, '00:00:00'));
    const templateRows = await availabilityQueries.getWeeklyTemplateByDoctor(pool, doctorId);

    const dayMatches = templateRows.filter((row) => row.day_of_week === targetDayName);
    workingWindows = dayMatches.map((row) => ({
      start_time: row.start_time,
      end_time: row.end_time,
    }));
  }

  if (workingWindows.length === 0) {
    return [];
  }

  // 3. Fetch already booked/checked-in appointments on this date
  const bookedAppointments = await availabilityQueries.getBookedAppointmentsForDoctor(
    pool,
    doctorId,
    dateStr
  );

  // 4. Compute open 20-minute slots
  return computeOpenSlots({
    dateStr,
    workingWindows,
    bookedAppointments,
  });
}