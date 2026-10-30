export async function logAuditEvent(client, { userId, action, resourceType, resourceId, patientId }) {
  const query = `
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, patient_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, user_id, action, created_at;
  `;
  const result = await client.query(query, [
    userId,
    action,
    resourceType,
    resourceId || null,
    patientId || null,
  ]);
  return result.rows[0];
}

export async function listAuditLogs(client, { userId, patientId, limit = 50 }) {
  let query = `
    SELECT a.id, a.user_id, a.action, a.resource_type, a.resource_id, a.patient_id, a.created_at,
           u.email as user_email, u.role as user_role
    FROM audit_logs a
    JOIN accounts u ON u.id = a.user_id
    WHERE 1=1
  `;
  const params = [];
  let paramIdx = 1;

  if (userId) {
    query += ` AND a.user_id = $${paramIdx++}`;
    params.push(userId);
  }

  if (patientId) {
    query += ` AND a.patient_id = $${paramIdx++}`;
    params.push(patientId);
  }

  query += ` ORDER BY a.created_at DESC LIMIT $${paramIdx};`;
  params.push(limit);

  const result = await client.query(query, params);
  return result.rows;
}