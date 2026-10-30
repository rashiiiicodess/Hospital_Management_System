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

export async function getMe(req, res, next) {
  try {
    const profile = await patientsService.getMyPatientProfile(req.user);
    res.status(200).json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const patient = await patientsService.getPatientById(req.user, Number(req.params.id));
    res.status(200).json({ data: patient });
  } catch (err) {
    next(err);
  }
}

export async function updateDemographics(req, res, next) {
  try {
    const updated = await patientsService.updateDemographics(req.user, Number(req.params.id), req.body);
    res.status(200).json({ message: 'Patient demographics updated', patient: updated });
  } catch (err) {
    next(err);
  }
}

export async function updateMedicalProfile(req, res, next) {
  try {
    const updated = await patientsService.updateMedicalProfile(req.user, Number(req.params.id), req.body);
    res.status(200).json({ message: 'Medical profile updated', profile: updated });
  } catch (err) {
    next(err);
  }
}