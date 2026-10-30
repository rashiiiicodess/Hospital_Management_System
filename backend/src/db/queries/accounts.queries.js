/**
 * Accounts database queries.
 * Each function takes a pool or transaction client as its first argument.
 */

export async function findAccountByEmail(client, email) {
  const query = `
    SELECT id, email, password_hash, role, status, created_at
    FROM accounts
    WHERE email = LOWER($1);
  `;
  const result = await client.query(query, [email]);
  return result.rows[0] || null;
}

export async function findAccountById(client, id) {
  const query = `
    SELECT id, email, password_hash, role, status, created_at
    FROM accounts
    WHERE id = $1;
  `;
  const result = await client.query(query, [id]);
  return result.rows[0] || null;
}

export async function createAccount(client, { email, passwordHash, role, status = 'active' }) {
  const query = `
    INSERT INTO accounts (email, password_hash, role, status)
    VALUES (LOWER($1), $2, $3, $4)
    RETURNING id, email, role, status, created_at;
  `;
  const result = await client.query(query, [email, passwordHash, role, status]);
  return result.rows[0];
}

export async function updatePassword(client, accountId, passwordHash) {
  const query = `
    UPDATE accounts
    SET password_hash = $1, status = 'active'
    WHERE id = $2
    RETURNING id, email, role, status;
  `;
  const result = await client.query(query, [passwordHash, accountId]);
  return result.rows[0] || null;
}
export async function listAccounts(client, { role, status, search }) {
  let query = `
    SELECT id, email, role, status, created_at
    FROM accounts
    WHERE 1=1
  `;
  const params = [];
  let paramIdx = 1;

  if (role) {
    query += ` AND role = $${paramIdx++}`;
    params.push(role);
  }

  if (status) {
    query += ` AND status = $${paramIdx++}`;
    params.push(status);
  }

  if (search) {
    query += ` AND email ILIKE $${paramIdx++}`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY created_at DESC;`;

  const result = await client.query(query, params);
  return result.rows;
}

export async function countActiveAdmins(client) {
  const query = `
    SELECT COUNT(*)::int as count
    FROM accounts
    WHERE role = 'admin' AND status = 'active';
  `;
  const result = await client.query(query);
  return result.rows[0].count;
}

export async function updateAccountStatus(client, accountId, newStatus) {
  const query = `
    UPDATE accounts
    SET status = $2
    WHERE id = $1
    RETURNING id, email, role, status;
  `;
  const result = await client.query(query, [accountId, newStatus]);
  return result.rows[0] || null;
}