import * as recordsService from '../services/records.service.js';

export async function saveVitals(req, res, next) {
  try {
    const vitals = await recordsService.saveVitals(req.user, req.params.id, req.body);
    res.status(200).json({ message: 'Patient vitals saved', vitals });
  } catch (err) {
    next(err);
  }
}

export async function saveMedicalRecord(req, res, next) {
  try {
    const record = await recordsService.saveMedicalRecord(req.user, req.params.id, req.body);
    res.status(200).json({ message: 'Visit record saved', record });
  } catch (err) {
    next(err);
  }
}

export async function finalizeRecord(req, res, next) {
  try {
    const finalized = await recordsService.finalizeRecordAndCompleteVisit(req.user, req.params.id);
    res.status(200).json({ message: 'Record finalized and appointment completed', record: finalized });
  } catch (err) {
    next(err);
  }
}

export async function getAppointmentRecord(req, res, next) {
  try {
    const data = await recordsService.getAppointmentRecord(req.user, req.params.id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getPatientHistory(req, res, next) {
  try {
    const history = await recordsService.getPatientHistory(req.user, parseInt(req.params.id, 10));
    res.status(200).json({ data: history });
  } catch (err) {
    next(err);
  }
}