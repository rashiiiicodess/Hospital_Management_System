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
    SELECT id, email, role, status, created_at
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