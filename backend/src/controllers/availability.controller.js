import * as availabilityService from '../services/availability.service.js';
import * as availabilityQueries from '../db/queries/availability.queries.js';
import { pool } from '../db/pool.js';

export async function setWeeklySchedule(req, res, next) {
  try {
    const updated = await availabilityService.setWeeklyTemplate(
      req.user.id,
      req.body.weeklySchedule
    );
    res.status(200).json({ message: 'Weekly schedule updated', data: updated });
  } catch (err) {
    next(err);
  }
}

export async function addDateOverride(req, res, next) {
  try {
    const override = await availabilityService.addOverride(req.user.id, req.body);
    res.status(201).json({ message: 'Date override saved', data: override });
  } catch (err) {
    next(err);
  }
}

export async function getOpenSlots(req, res, next) {
  try {
    const doctorId = req.params.id;
    const dateStr = req.query.date;
    const slots = await availabilityService.getDoctorSlots(doctorId, dateStr);
    res.status(200).json({ doctorId, date: dateStr, slotsCount: slots.length, slots });
  } catch (err) {
    next(err);
  }
}
export async function getMyAvailability(req, res, next) {
  try {
    const weekly = await availabilityQueries.getWeeklyTemplateByDoctor(pool, req.user.id);
    res.status(200).json({ doctorId: req.user.id, weeklySchedule: weekly });
  } catch (err) {
    next(err);
  }
}