export async function getDashboardSummary(client) {
  const query = `
    SELECT
      (SELECT COUNT(*)::int FROM appointments 
       WHERE DATE(start_time AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
         AND status IN ('booked', 'checked_in', 'completed')) as appointments_today,

      (SELECT COUNT(*)::int FROM appointments 
       WHERE start_time > NOW() 
         AND start_time <= (NOW() + INTERVAL '7 days')
         AND status IN ('booked', 'checked_in')) as upcoming_this_week,

      (SELECT COUNT(*)::int FROM patients) as total_patients,

      (SELECT COUNT(*)::int FROM doctors d 
       JOIN accounts a ON a.id = d.account_id 
       WHERE a.status = 'active') as active_doctors,

      (SELECT COUNT(*)::int FROM appointments 
       WHERE status = 'needs_reschedule') as pending_reschedules;
  `;
  const result = await client.query(query);
  return result.rows[0];
}

export async function getAppointmentsByStatus(client) {
  const query = `
    SELECT status, COUNT(*)::int as count
    FROM appointments
    GROUP BY status
    ORDER BY count DESC;
  `;
  const result = await client.query(query);
  return result.rows;
}

export async function getAppointmentsByDepartment(client) {
  const query = `
    SELECT COALESCE(dept.name, 'Unassigned') as department_name, 
           COUNT(a.id)::int as appointment_count
    FROM appointments a
    JOIN doctors d ON d.account_id = a.doctor_id
    LEFT JOIN departments dept ON dept.id = d.department_id
    GROUP BY dept.name
    ORDER BY appointment_count DESC;
  `;
  const result = await client.query(query);
  return result.rows;
}