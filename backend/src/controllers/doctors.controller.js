import * as doctorsService from '../services/doctors.service.js';

export async function list(req, res, next) {
  try {
    const doctors = await doctorsService.listDoctors({
      departmentId: req.query.departmentId ? Number(req.query.departmentId) : null,
      search: req.query.search || null,
    });
    res.status(200).json({ data: doctors });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const doctor = await doctorsService.getDoctorById(Number(req.params.id));
    res.status(200).json({ data: doctor });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const updated = await doctorsService.updateSelfProfile(req.user.id, req.body);
    res.status(200).json({ message: 'Profile updated successfully', doctor: updated });
  } catch (err) {
    next(err);
  }
}

export async function updateByAdmin(req, res, next) {
  try {
    const updated = await doctorsService.updateDoctorByAdmin(Number(req.params.id), req.body);
    res.status(200).json({ message: 'Doctor updated successfully', doctor: updated });
  } catch (err) {
    next(err);
  }
}