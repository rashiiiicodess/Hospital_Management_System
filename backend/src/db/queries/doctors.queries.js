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

export async function listDoctors(client, { departmentId = null, search = null } = {}) {
  let query = `
    SELECT d.account_id as id, d.first_name, d.last_name, d.specialization,
           d.bio, d.qualifications, d.experience_years, d.languages,
           dept.id as department_id, dept.name as department_name,
           a.email, a.status
    FROM doctors d
    JOIN accounts a ON a.id = d.account_id
    LEFT JOIN departments dept ON dept.id = d.department_id
    WHERE a.status = 'active'
  `;
  const params = [];
  let paramIdx = 1;

  if (departmentId) {
    query += ` AND d.department_id = $${paramIdx++}`;
    params.push(departmentId);
  }

  if (search) {
    query += ` AND (d.first_name ILIKE $${paramIdx} OR d.last_name ILIKE $${paramIdx} OR d.specialization ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  query += ` ORDER BY d.first_name ASC;`;

  const result = await client.query(query, params);
  return result.rows;
}

export async function findDoctorById(client, doctorId) {
  const query = `
    SELECT d.account_id as id, d.first_name, d.last_name, d.specialization,
           d.bio, d.qualifications, d.experience_years, d.languages,
           dept.id as department_id, dept.name as department_name,
           a.email, a.status
    FROM doctors d
    JOIN accounts a ON a.id = d.account_id
    LEFT JOIN departments dept ON dept.id = d.department_id
    WHERE d.account_id = $1;
  `;
  const result = await client.query(query, [doctorId]);
  return result.rows[0] || null;
}

export async function updateDoctorSelfProfile(client, doctorId, { bio, qualifications, experienceYears, languages }) {
  const query = `
    UPDATE doctors
    SET bio = COALESCE($2, bio),
        qualifications = COALESCE($3, qualifications),
        experience_years = COALESCE($4, experience_years),
        languages = COALESCE($5, languages)
    WHERE account_id = $1
    RETURNING account_id as id, first_name, last_name, specialization, bio, qualifications, experience_years, languages;
  `;
  const result = await client.query(query, [
    doctorId,
    bio || null,
    qualifications || null,
    experienceYears || null,
    languages || null,
  ]);
  return result.rows[0] || null;
}

export async function updateDoctorAdmin(client, doctorId, { departmentId, specialization }) {
  const query = `
    UPDATE doctors
    SET department_id = COALESCE($2, department_id),
        specialization = COALESCE($3, specialization)
    WHERE account_id = $1
    RETURNING account_id as id, department_id, specialization;
  `;
  const result = await client.query(query, [
    doctorId,
    departmentId || null,
    specialization || null,
  ]);
  return result.rows[0] || null;
}