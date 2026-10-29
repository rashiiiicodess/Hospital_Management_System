import * as accountsService from '../services/accounts.service.js';

export async function createDoctor(req, res, next) {
  try {
    const result = await accountsService.createDoctorWithInvite(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function createStaff(req, res, next) {
  try {
    const result = await accountsService.createStaffWithInvite(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}