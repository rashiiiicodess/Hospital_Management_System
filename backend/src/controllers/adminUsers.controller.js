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


export async function listUsers(req, res, next) {
  try {
    const users = await accountsService.listAllAccounts(req.query);
    res.status(200).json({ data: users });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const result = await accountsService.setAccountStatus(
      req.user,
      req.params.id,
      req.body.status
    );
    res.status(200).json({ message: `Account status updated to ${req.body.status}`, ...result });
  } catch (err) {
    next(err);
  }
}