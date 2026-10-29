export async function queueNotification(client, { recipientEmail, subject, bodyText, bodyHtml = null }) {
  const query = `
    INSERT INTO notifications (recipient_email, subject, body_text, body_html)
    VALUES ($1, $2, $3, $4)
    RETURNING id, recipient_email, subject, status, created_at;
  `;
  const result = await client.query(query, [recipientEmail, subject, bodyText, bodyHtml]);
  return result.rows[0];
}

export async function claimPendingNotifications(client, batchSize = 10) {
  // Uses FOR UPDATE SKIP LOCKED to prevent duplicate processing by concurrent workers
  const query = `
    SELECT id, recipient_email, subject, body_text, body_html, attempts
    FROM notifications
    WHERE status = 'pending' AND attempts < max_attempts
    ORDER BY created_at ASC
    LIMIT $1
    FOR UPDATE SKIP LOCKED;
  `;
  const result = await client.query(query, [batchSize]);
  return result.rows;
}

export async function markNotificationSent(client, id) {
  const query = `
    UPDATE notifications
    SET status = 'sent', sent_at = NOW()
    WHERE id = $1;
  `;
  await client.query(query, [id]);
}

export async function markNotificationFailed(client, id, errorMessage) {
  const query = `
    UPDATE notifications
    SET status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed'::notification_status ELSE 'pending'::notification_status END,
        attempts = attempts + 1,
        error_message = $2
    WHERE id = $1;
  `;
  await client.query(query, [id, errorMessage]);
}