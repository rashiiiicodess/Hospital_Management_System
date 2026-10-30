export async function createAppointment(client, { doctorId, patientId, startTime, endTime }) {
  const query = `
    INSERT INTO appointments (doctor_id, patient_id, start_time, end_time, status)
    VALUES ($1, $2, $3, $4, 'booked')
    RETURNING id, doctor_id, patient_id, start_time, end_time, status, created_at;
  `;
  const result = await client.query(query, [doctorId, patientId, startTime, endTime]);
  return result.rows[0];
}

export async function findAppointmentById(client, id) {
  const query = `
    SELECT a.*,
           doc.first_name as doctor_first_name, doc.last_name as doctor_last_name,
           pat.first_name as patient_first_name, pat.last_name as patient_last_name,
           pat.account_id as patient_account_id
    FROM appointments a
    JOIN doctors doc ON doc.account_id = a.doctor_id
    JOIN patients pat ON pat.id = a.patient_id
    WHERE a.id = $1;
  `;
  const result = await client.query(query, [id]);
  return result.rows[0] || null;
}

export async function listAppointments(client, { role, userId, status, doctorId, date }) {
  let query = `
    SELECT a.id, a.doctor_id, a.patient_id, a.start_time, a.end_time, a.status,
           doc.first_name as doctor_first_name, doc.last_name as doctor_last_name,
           pat.first_name as patient_first_name, pat.last_name as patient_last_name
    FROM appointments a
    JOIN doctors doc ON doc.account_id = a.doctor_id
    JOIN patients pat ON pat.id = a.patient_id
    WHERE 1=1
  `;
  const params = [];
  let paramIdx = 1;

  // Role scoping
  if (role === 'doctor') {
    query += ` AND a.doctor_id = $${paramIdx++}`;
    params.push(userId);
  } else if (role === 'patient') {
    // Patients are scoped by their account_id -> resolve through patients table
    query += ` AND pat.account_id = $${paramIdx++}`;
    params.push(userId);
  }

  if (doctorId && role !== 'doctor') {
    query += ` AND a.doctor_id = $${paramIdx++}`;
    params.push(doctorId);
  }

  if (status) {
    query += ` AND a.status = $${paramIdx++}`;
    params.push(status);
  }

  if (date) {
    query += ` AND DATE(a.start_time AT TIME ZONE 'Asia/Kolkata') = $${paramIdx++}`;
    params.push(date);
  }

  query += ` ORDER BY a.start_time ASC;`;

  const result = await client.query(query, params);
  return result.rows;
}

export async function updateAppointmentStatus(client, { id, status, cancellationReason = null, cancelledBy = null }) {
  const query = `
    UPDATE appointments
    SET status = $2,
        cancellation_reason = COALESCE($3, cancellation_reason),
        cancelled_by = COALESCE($4, cancelled_by),
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, doctor_id, patient_id, start_time, end_time, status, cancellation_reason, updated_at;
  `;
  const result = await client.query(query, [id, status, cancellationReason, cancelledBy]);
  return result.rows[0];
}

export async function listRescheduleQueue(client) {
  const query = `
    SELECT a.id, a.doctor_id, a.patient_id, a.start_time, a.end_time, a.status, a.cancellation_reason,
           doc.first_name as doctor_first_name, doc.last_name as doctor_last_name,
           pat.first_name as patient_first_name, pat.last_name as patient_last_name, pat.phone as patient_phone
    FROM appointments a
    JOIN doctors doc ON doc.account_id = a.doctor_id
    JOIN patients pat ON pat.id = a.patient_id
    WHERE a.status = 'needs_reschedule'
    ORDER BY a.start_time ASC;
  `;
  const result = await client.query(query);
  return result.rows;
}

export async function rescheduleAppointmentSlot(client, { id, startTime, endTime }) {
  const query = `
    UPDATE appointments
    SET start_time = $2,
        end_time = $3,
        status = 'booked',
        cancellation_reason = NULL,
        cancelled_by = NULL,
        updated_at = NOW()
    WHERE id = $1
    RETURNING id, doctor_id, patient_id, start_time, end_time, status, updated_at;
  `;
  const result = await client.query(query, [id, startTime, endTime]);
  return result.rows[0];
}

export async function flagDoctorFutureAppointmentsAsNeedsReschedule(client, doctorId) {
  const query = `
    UPDATE appointments
    SET status = 'needs_reschedule',
        cancellation_reason = 'Doctor account deactivated',
        updated_at = NOW()
    WHERE doctor_id = $1
      AND start_time > NOW()
      AND status = 'booked'
    RETURNING id, doctor_id, patient_id, start_time, status;
  `;
  const result = await client.query(query, [doctorId]);
  return result.rows;
}

export async function findUpcomingAppointmentsNeedingReminder(client) {
  const query = `
    SELECT a.id, a.doctor_id, a.patient_id, a.start_time,
           pat.first_name as patient_first_name, pat.last_name as patient_last_name,
           acc.email as patient_email,
           doc.first_name as doctor_first_name, doc.last_name as doctor_last_name
    FROM appointments a
    JOIN patients pat ON pat.id = a.patient_id
    LEFT JOIN accounts acc ON acc.id = pat.account_id
    JOIN doctors doc ON doc.account_id = a.doctor_id
    WHERE a.status = 'booked'
      AND a.start_time BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
     AND a.reminder_sent_at IS NULL;
  `;
  const result = await client.query(query);
  return result.rows;
}
export async function markReminderSent(client, appointmentId) {
  const query = `
    UPDATE appointments
    SET reminder_sent_at = NOW()
    WHERE id = $1;
  `;
  await client.query(query, [appointmentId]);
}