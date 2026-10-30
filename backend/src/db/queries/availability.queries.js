export async function getWeeklyTemplateByDoctor(client, doctorId) {
  const query = `
    SELECT day_of_week, start_time::text, end_time::text
    FROM doctor_availability_templates
    WHERE doctor_id = $1
    ORDER BY day_of_week;
  `;
  const result = await client.query(query, [doctorId]);
  return result.rows;
}

export async function replaceWeeklyTemplate(client, doctorId, weeklySlots) {
  // Delete existing weekly template for doctor
  await client.query('DELETE FROM doctor_availability_templates WHERE doctor_id = $1', [doctorId]);

  if (weeklySlots.length === 0) return [];

  // Insert new weekly template rows
  const values = [];
  const params = [doctorId];
  let paramIdx = 2;

  for (const slot of weeklySlots) {
    values.push(`($1, $${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2})`);
    params.push(slot.dayOfWeek, slot.startTime, slot.endTime);
    paramIdx += 3;
  }

  const query = `
    INSERT INTO doctor_availability_templates (doctor_id, day_of_week, start_time, end_time)
    VALUES ${values.join(', ')}
    RETURNING id, day_of_week, start_time::text, end_time::text;
  `;

  const result = await client.query(query, params);
  return result.rows;
}

export async function getOverrideForDate(client, doctorId, dateStr) {
  const query = `
    SELECT id, override_date::text, is_day_off, start_time::text, end_time::text
    FROM doctor_availability_overrides
    WHERE doctor_id = $1 AND override_date = $2;
  `;
  const result = await client.query(query, [doctorId, dateStr]);
  return result.rows[0] || null;
}

export async function addDateOverride(client, { doctorId, overrideDate, isDayOff, startTime, endTime }) {
  // Upsert override for that specific date
  const query = `
    INSERT INTO doctor_availability_overrides (doctor_id, override_date, is_day_off, start_time, end_time)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (id) DO UPDATE
    SET is_day_off = $3, start_time = $4, end_time = $5
    RETURNING id, override_date::text, is_day_off, start_time::text, end_time::text;
  `;
  const result = await client.query(query, [
    doctorId,
    overrideDate,
    isDayOff,
    isDayOff ? null : startTime,
    isDayOff ? null : endTime,
  ]);
  return result.rows[0];
}

export async function getBookedAppointmentsForDoctor(client, doctorId, dateStr) {
  const query = `
    SELECT start_time, end_time
    FROM appointments
    WHERE doctor_id = $1
      AND DATE(start_time AT TIME ZONE 'Asia/Kolkata') = $2
      AND status IN ('booked', 'checked_in')
    ORDER BY start_time ASC;
  `;
  const result = await client.query(query, [doctorId, dateStr]);
  return result.rows;
}