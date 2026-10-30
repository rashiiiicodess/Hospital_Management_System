import * as prescriptionsService from '../services/prescriptions.service.js';

export async function save(req, res, next) {
  try {
    const saved = await prescriptionsService.savePrescription(req.user, req.params.id, req.body);
    res.status(201).json({ message: 'Prescription issued successfully', prescription: saved });
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const prescription = await prescriptionsService.getPrescription(req.user, req.params.id);
    res.status(200).json({ data: prescription });
  } catch (err) {
    next(err);
  }
}

export async function downloadPDF(req, res, next) {
  try {
    const pdfStream = await prescriptionsService.downloadPrescriptionPDF(req.user, req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="prescription-appointment-${req.params.id}.pdf"`
    );

    pdfStream.pipe(res);
  } catch (err) {
    next(err);
  }
}