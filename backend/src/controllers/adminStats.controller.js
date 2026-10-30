import * as statsService from '../services/stats.service.js';

export async function getSummary(req, res, next) {
  try {
    const summary = await statsService.getSummaryStats();
    res.status(200).json({ data: summary });
  } catch (err) {
    next(err);
  }
}

export async function getByStatus(req, res, next) {
  try {
    const breakdown = await statsService.getStatusBreakdown();
    res.status(200).json({ data: breakdown });
  } catch (err) {
    next(err);
  }
}

export async function getByDepartment(req, res, next) {
  try {
    const breakdown = await statsService.getDepartmentBreakdown();
    res.status(200).json({ data: breakdown });
  } catch (err) {
    next(err);
  }
}