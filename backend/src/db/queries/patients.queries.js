export async function createWalkInPatient(client, { firstName, lastName, phone, email, dateOfBirth }) {
  const query = `
    INSERT INTO patients (account_id, first_name, last_name, phone, date_of_birth)
    VALUES (NULL, $1, $2, $3, $4)
    RETURNING id, account_id, first_name, last_name, phone, date_of_birth;
  `;
  const result = await client.query(query, [
    firstName,
    lastName,
    phone,
    dateOfBirth || null,
  ]);
  return result.rows[0];
}

export async function findPotentialDuplicates(client, { phone, email }) {
  const query = `
    SELECT p.id, p.first_name, p.last_name, p.phone, a.email
    FROM patients p
    LEFT JOIN accounts a ON a.id = p.account_id
    WHERE p.phone = $1 OR (a.email IS NOT NULL AND LOWER(a.email) = LOWER($2));
  `;
  const result = await client.query(query, [phone, email || '']);
  return result.rows;
}

export async function searchPatients(client, searchTerm) {
  const query = `
    SELECT p.id, p.account_id, p.first_name, p.last_name, p.phone, p.date_of_birth,
           p.gender, p.blood_group, a.email
    FROM patients p
    LEFT JOIN accounts a ON a.id = p.account_id
    WHERE p.first_name ILIKE $1 
       OR p.last_name ILIKE $1 
       OR p.phone ILIKE $1
       OR a.email ILIKE $1
    ORDER BY p.first_name ASC
    LIMIT 20;
  `;
  const result = await client.query(query, [`%${searchTerm}%`]);
  return result.rows;
}

export async function findPatientById(client, id) {
  const query = `
    SELECT p.id, p.account_id, p.first_name, p.last_name, p.phone, p.date_of_birth,
           p.gender, p.address, p.blood_group, p.allergies, p.chronic_conditions, p.emergency_contact,
           a.email
    FROM patients p
    LEFT JOIN accounts a ON a.id = p.account_id
    WHERE p.id = $1;
  `;
  const result = await client.query(query, [id]);
  return result.rows[0] || null;
}

export async function findPatientByAccountId(client, accountId) {
  const query = `
    SELECT p.id, p.account_id, p.first_name, p.last_name, p.phone, p.date_of_birth,
           p.gender, p.address, p.blood_group, p.allergies, p.chronic_conditions, p.emergency_contact,
           a.email
    FROM patients p
    JOIN accounts a ON a.id = p.account_id
    WHERE p.account_id = $1;
  `;
  const result = await client.query(query, [accountId]);
  return result.rows[0] || null;
}

export async function updatePatientDemographics(client, id, { firstName, lastName, phone, dateOfBirth, gender, address }) {
  const query = `
    UPDATE patients
    SET first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        phone = COALESCE($4, phone),
        date_of_birth = COALESCE($5, date_of_birth),
        gender = COALESCE($6, gender),
        address = COALESCE($7, address)
    WHERE id = $1
    RETURNING id, account_id, first_name, last_name, phone, date_of_birth, gender, address;
  `;
  const result = await client.query(query, [
    id,
    firstName || null,
    lastName || null,
    phone || null,
    dateOfBirth || null,
    gender || null,
    address || null,
  ]);
  return result.rows[0] || null;
}

export async function updatePatientMedicalProfile(client, id, { bloodGroup, allergies, chronicConditions, emergencyContact }) {
  const query = `
    UPDATE patients
    SET blood_group = COALESCE($2, blood_group),
        allergies = COALESCE($3, allergies),
        chronic_conditions = COALESCE($4, chronic_conditions),
        emergency_contact = COALESCE($5, emergency_contact)
    WHERE id = $1
    RETURNING id, blood_group, allergies, chronic_conditions, emergency_contact;
  `;
  const result = await client.query(query, [
    id,
    bloodGroup || null,
    allergies || null,
    chronicConditions || null,
    emergencyContact || null,
  ]);
  return result.rows[0] || null;
}