export async function upsertVitals(client, { appointmentId, bloodPressureSystolic, bloodPressureDiastolic, pulseRate, temperatureCelsius, spo2Percentage, weightKg, heightCm }) {
  const query = `
    INSERT INTO patient_vitals (
      appointment_id, blood_pressure_systolic, blood_pressure_diastolic,
      pulse_rate, temperature_celsius, spo2_percentage, weight_kg, height_cm, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (appointment_id) DO UPDATE
    SET blood_pressure_systolic = EXCLUDED.blood_pressure_systolic,
        blood_pressure_diastolic = EXCLUDED.blood_pressure_diastolic,
        pulse_rate = EXCLUDED.pulse_rate,
        temperature_celsius = EXCLUDED.temperature_celsius,
        spo2_percentage = EXCLUDED.spo2_percentage,
        weight_kg = EXCLUDED.weight_kg,
        height_cm = EXCLUDED.height_cm,
        updated_at = NOW()
    RETURNING *;
  `;
  const result = await client.query(query, [
    appointmentId,
    bloodPressureSystolic || null,
    bloodPressureDiastolic || null,
    pulseRate || null,
    temperatureCelsius || null,
    spo2Percentage || null,
    weightKg || null,
    heightCm || null,
  ]);
  return result.rows[0];
}

export async function findVitalsByAppointmentId(client, appointmentId) {
  const query = `SELECT * FROM patient_vitals WHERE appointment_id = $1;`;
  const result = await client.query(query, [appointmentId]);
  return result.rows[0] || null;
}

export async function upsertMedicalRecord(client, { appointmentId, patientId, doctorId, chiefComplaint, diagnosis, clinicalNotes, followUpDate }) {
  const query = `
    INSERT INTO medical_records (
      appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, clinical_notes, follow_up_date, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (appointment_id) DO UPDATE
    SET chief_complaint = EXCLUDED.chief_complaint,
        diagnosis = EXCLUDED.diagnosis,
        clinical_notes = EXCLUDED.clinical_notes,
        follow_up_date = EXCLUDED.follow_up_date,
        updated_at = NOW()
    WHERE medical_records.is_finalized = false
    RETURNING *;
  `;
  const result = await client.query(query, [
    appointmentId,
    patientId,
    doctorId,
    chiefComplaint,
    diagnosis || null,
    clinicalNotes || null,
    followUpDate || null,
  ]);
  return result.rows[0] || null;
}

export async function findMedicalRecordByAppointmentId(client, appointmentId) {
  const query = `SELECT * FROM medical_records WHERE appointment_id = $1;`;
  const result = await client.query(query, [appointmentId]);
  return result.rows[0] || null;
}

export async function finalizeMedicalRecord(client, appointmentId) {
  const query = `
    UPDATE medical_records
    SET is_finalized = true, finalized_at = NOW(), updated_at = NOW()
    WHERE appointment_id = $1 AND is_finalized = false
    RETURNING *;
  `;
  const result = await client.query(query, [appointmentId]);
  return result.rows[0] || null;
}

export async function getPatientMedicalHistory(client, patientId) {
  const query = `
    SELECT mr.*, 
           doc.first_name as doctor_first_name, doc.last_name as doctor_last_name,
           v.blood_pressure_systolic, v.blood_pressure_diastolic, v.pulse_rate,
           v.temperature_celsius, v.spo2_percentage, v.weight_kg, v.height_cm,
           a.start_time as visit_date
    FROM medical_records mr
    JOIN appointments a ON a.id = mr.appointment_id
    JOIN doctors doc ON doc.account_id = mr.doctor_id
    LEFT JOIN patient_vitals v ON v.appointment_id = mr.appointment_id
    WHERE mr.patient_id = $1
    ORDER BY a.start_time DESC;
  `;
  const result = await client.query(query, [patientId]);
  return result.rows;
}