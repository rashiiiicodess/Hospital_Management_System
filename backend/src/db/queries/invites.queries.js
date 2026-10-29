export async function createInvite(client, { accountId, tokenHash, expiresAt }) {
  const query = `
    INSERT INTO invites (account_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING id, account_id, token_hash, expires_at, created_at;
  `;
  const result = await client.query(query, [accountId, tokenHash, expiresAt]);
  return result.rows[0];
}

export async function findInviteByTokenHash(client, tokenHash) {
  const query = `
    SELECT i.id, i.account_id, i.token_hash, i.expires_at, i.claimed_at,
           a.email, a.role, a.status as account_status
    FROM invites i
    JOIN accounts a ON a.id = i.account_id
    WHERE i.token_hash = $1;
  `;
  const result = await client.query(query, [tokenHash]);
  return result.rows[0] || null;
}

export async function markInviteClaimed(client, inviteId) {
  const query = `
    UPDATE invites
    SET claimed_at = NOW()
    WHERE id = $1
    RETURNING id, account_id, claimed_at;
  `;
  const result = await client.query(query, [inviteId]);
  return result.rows[0] || null;
}