export async function createPrescription(client, { appointmentId, doctorId, patientId, notes }) {
  // If a prescription already exists for this appointment, delete old items first to replace
  await client.query('DELETE FROM prescriptions WHERE appointment_id = $1', [appointmentId]);

  const query = `
    INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, notes)
    VALUES ($1, $2, $3, $4)
    RETURNING id, appointment_id, doctor_id, patient_id, notes, created_at;
  `;
  const result = await client.query(query, [appointmentId, doctorId, patientId, notes || null]);
  return result.rows[0];
}

export async function addPrescriptionItems(client, prescriptionId, items) {
  if (items.length === 0) return [];

  const values = [];
  const params = [prescriptionId];
  let paramIdx = 2;

  for (const item of items) {
    values.push(`($1, $${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4})`);
    params.push(item.medicineName, item.dosage, item.frequency, item.duration, item.instructions || null);
    paramIdx += 5;
  }

  const query = `
    INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions)
    VALUES ${values.join(', ')}
    RETURNING id, medicine_name, dosage, frequency, duration, instructions;
  `;
  const result = await client.query(query, params);
  return result.rows;
}

export async function findPrescriptionByAppointmentId(client, appointmentId) {
  const query = `
    SELECT p.*,
           doc.first_name as doctor_first_name, doc.last_name as doctor_last_name, doc.specialization,
           pat.first_name as patient_first_name, pat.last_name as patient_last_name, pat.phone as patient_phone,
           a.start_time
    FROM prescriptions p
    JOIN doctors doc ON doc.account_id = p.doctor_id
    JOIN patients pat ON pat.id = p.patient_id
    JOIN appointments a ON a.id = p.appointment_id
    WHERE p.appointment_id = $1;
  `;
  const result = await client.query(query, [appointmentId]);
  const prescription = result.rows[0] || null;

  if (!prescription) return null;

  const itemsRes = await client.query(
    'SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id ASC',
    [prescription.id]
  );
  prescription.items = itemsRes.rows;

  return prescription;
}