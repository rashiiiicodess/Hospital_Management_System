import * as departmentsService from '../services/departments.service.js';

export async function listDepartments(req, res, next) {
  try {
    const list = await departmentsService.getAllDepartments();
    res.status(200).json({ data: list });
  } catch (err) {
    next(err);
  }
}

export async function createDepartment(req, res, next) {
  try {
    const created = await departmentsService.addDepartment(req.body.name);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}