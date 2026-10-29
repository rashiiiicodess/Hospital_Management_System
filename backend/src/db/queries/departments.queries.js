export async function listDepartments(client) {
  const query = `
    SELECT id, name
    FROM departments
    ORDER BY name ASC;
  `;
  const result = await client.query(query);
  return result.rows;
}

export async function findDepartmentById(client, id) {
  const query = `
    SELECT id, name
    FROM departments
    WHERE id = $1;
  `;
  const result = await client.query(query, [id]);
  return result.rows[0] || null;
}

export async function createDepartment(client, name) {
  const query = `
    INSERT INTO departments (name)
    VALUES ($1)
    RETURNING id, name;
  `;
  const result = await client.query(query, [name]);
  return result.rows[0];
}

export async function countDoctorsInDepartment(client, departmentId) {
  const query = `
    SELECT COUNT(*)::int as count
    FROM doctors
    WHERE department_id = $1;
  `;
  const result = await client.query(query, [departmentId]);
  return result.rows[0].count;
}