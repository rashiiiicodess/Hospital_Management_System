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
    SELECT p.id, p.account_id, p.first_name, p.last_name, p.phone, p.date_of_birth, a.email
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