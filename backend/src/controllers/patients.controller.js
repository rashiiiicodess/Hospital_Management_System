import * as patientsService from '../services/patients.service.js';

export async function registerWalkIn(req, res, next) {
  try {
    const patient = await patientsService.registerWalkIn(req.body);
    res.status(201).json({ message: 'Walk-in patient registered', patient });
  } catch (err) {
    next(err);
  }
}

export async function searchPatients(req, res, next) {
  try {
    const list = await patientsService.searchPatients(req.query.q);
    res.status(200).json({ data: list });
  } catch (err) {
    next(err);
  }
}