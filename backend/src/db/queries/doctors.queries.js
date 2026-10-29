export async function createDoctor(client, { accountId, departmentId, firstName, lastName, specialization }) {
  const query = `
    INSERT INTO doctors (account_id, department_id, first_name, last_name, specialization)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING account_id, department_id, first_name, last_name, specialization;
  `;
  const result = await client.query(query, [
    accountId,
    departmentId,
    firstName,
    lastName,
    specialization || null,
  ]);
  return result.rows[0];
}

export async function listDoctors(client, departmentId = null) {
  let query = `
    SELECT d.account_id, d.first_name, d.last_name, d.specialization,
           dept.id as department_id, dept.name as department_name,
           a.email, a.status
    FROM doctors d
    JOIN accounts a ON a.id = d.account_id
    LEFT JOIN departments dept ON dept.id = d.department_id
  `;
  const params = [];

  if (departmentId) {
    query += ` WHERE d.department_id = $1`;
    params.push(departmentId);
  }

  query += ` ORDER BY d.first_name ASC;`;

  const result = await client.query(query, params);
  return result.rows;
}