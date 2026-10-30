import PDFDocument from 'pdfkit';

/**
 * Builds a clean, professional medical prescription PDF.
 * Returns a readable stream that can be piped directly to Express res.
 *
 * @param {object} data
 * @param {object} data.doctor - { first_name, last_name, specialization }
 * @param {object} data.patient - { first_name, last_name, phone }
 * @param {object} data.appointment - { id, start_time }
 * @param {Array<object>} data.items - Prescription items
 * @param {string} data.notes - Optional doctor instructions
 * @returns {PDFDocument}
 */
export function generatePrescriptionPDF({ doctor, patient, appointment, items = [], notes }) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // 1. Hospital Header
  doc
    .fontSize(22)
    .fillColor('#0056b3')
    .text('HOSPITAL MANAGEMENT SYSTEM', { align: 'center' });

  doc
    .fontSize(10)
    .fillColor('#666666')
    .text('Official Medical Prescription & Outpatient Care', { align: 'center' })
    .moveDown(1.5);

  doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke().moveDown(1);

  // 2. Doctor and Patient Info Blocks (2 columns)
  const currentY = doc.y;

  // Doctor Column (Left)
  doc
    .fontSize(11)
    .fillColor('#111111')
    .text(`Dr. ${doctor.first_name} ${doctor.last_name}`, 50, currentY, { bold: true })
    .fontSize(9)
    .fillColor('#444444')
    .text(`Specialization: ${doctor.specialization || 'General Physician'}`)
    .text(`Appointment ID: #${appointment.id}`);

  // Patient Column (Right)
  doc
    .fontSize(11)
    .fillColor('#111111')
    .text(`Patient: ${patient.first_name} ${patient.last_name}`, 320, currentY)
    .fontSize(9)
    .fillColor('#444444')
    .text(`Phone: ${patient.phone || 'N/A'}`)
    .text(`Date: ${new Date(appointment.start_time).toLocaleDateString()}`)
    .moveDown(2);

  // Divider
  doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, 160).lineTo(545, 160).stroke();

  // 3. Rx Symbol
  doc.y = 175;
  doc.fontSize(20).fillColor('#0056b3').text('℞', 50, doc.y).moveDown(0.5);

  // 4. Prescription Table Header
  const tableTop = doc.y;
  doc
    .fontSize(10)
    .fillColor('#333333')
    .text('Medicine', 50, tableTop, { width: 140, bold: true })
    .text('Dosage', 190, tableTop, { width: 80, bold: true })
    .text('Frequency', 270, tableTop, { width: 90, bold: true })
    .text('Duration', 360, tableTop, { width: 70, bold: true })
    .text('Instructions', 430, tableTop, { width: 115, bold: true });

  doc.strokeColor('#0056b3').lineWidth(1.5).moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();

  let itemY = tableTop + 25;

  // 5. Table Rows
  items.forEach((item, index) => {
    doc
      .fontSize(9)
      .fillColor('#222222')
      .text(item.medicine_name, 50, itemY, { width: 140 })
      .text(item.dosage, 190, itemY, { width: 80 })
      .text(item.frequency, 270, itemY, { width: 90 })
      .text(item.duration, 360, itemY, { width: 70 })
      .text(item.instructions || '-', 430, itemY, { width: 115 });

    itemY += 25;
    doc.strokeColor('#f0f0f0').lineWidth(0.5).moveTo(50, itemY - 5).lineTo(545, itemY - 5).stroke();
  });

  // 6. Doctor Notes (if any)
  if (notes) {
    doc.y = itemY + 15;
    doc
      .fontSize(10)
      .fillColor('#111111')
      .text('Special Advice / Doctor Notes:', 50, doc.y, { underline: true })
      .moveDown(0.3)
      .fontSize(9)
      .fillColor('#444444')
      .text(notes, 50, doc.y);
  }

  // 7. Footer & Signature
  doc
    .fontSize(9)
    .fillColor('#777777')
    .text('Digitally signed prescription. Valid without physical stamp.', 50, 720, { align: 'center' });

  doc.end();
  return doc;
}