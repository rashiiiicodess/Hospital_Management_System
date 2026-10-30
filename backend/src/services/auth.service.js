import { pool, withTransaction } from '../db/pool.js';
import * as accountsQueries from '../db/queries/accounts.queries.js';
import * as invitesQueries from '../db/queries/invites.queries.js';
import { hashPassword, comparePassword } from '../lib/password.js';
import { generateAccessToken, generateRandomToken, hashToken } from './tokens.service.js';
import { UnauthorizedError, ConflictError, NotFoundError, BadRequestError } from '../errors/AppError.js';
import { handleDbError } from '../lib/dbErrors.js';

export async function registerPatient({ email, password, firstName, lastName, phone, dateOfBirth }) {
  return withTransaction(async (client) => {
    try {
      // 1. Check if email already in use
      const existing = await accountsQueries.findAccountByEmail(client, email);
      if (existing) {
        throw new ConflictError('An account with this email already exists', 'EMAIL_IN_USE');
      }

      // 2. Hash password and create patient account
      const passwordHash = await hashPassword(password);
      const account = await accountsQueries.createAccount(client, {
        email,
        passwordHash,
        role: 'patient',
        status: 'active',
      });

      // 3. Create linked patient record
      await client.query(
        `INSERT INTO patients (account_id, first_name, last_name, phone, date_of_birth)
         VALUES ($1, $2, $3, $4, $5)`,
        [account.id, firstName, lastName, phone || null, dateOfBirth || null]
      );

      // 4. Generate access token
      const accessToken = generateAccessToken({
        accountId: account.id,
        role: account.role,
      });

      return {
        user: { id: account.id, email: account.email, role: account.role },
        accessToken,
      };
    } catch (err) {
      handleDbError(err);
    }
  });
}

export async function login({ email, password }) {
  const account = await accountsQueries.findAccountByEmail(pool, email);

  if (!account || !account.password_hash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (account.status !== 'active') {
    throw new UnauthorizedError('Account is not active', 'FORBIDDEN');
  }

  const isMatch = await comparePassword(password, account.password_hash);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = generateAccessToken({
    accountId: account.id,
    role: account.role,
  });

  return {
    user: { id: account.id, email: account.email, role: account.role },
    accessToken,
  };
}

export async function acceptInvite({ token, password }) {
  return withTransaction(async (client) => {
    const tokenHash = hashToken(token);
    const invite = await invitesQueries.findInviteByTokenHash(client, tokenHash);

    if (!invite) {
      throw new NotFoundError('Invite not found or invalid');
    }

    if (invite.claimed_at) {
      throw new ConflictError('This invite has already been claimed', 'ALREADY_HANDLED');
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new UnauthorizedError('This invite has expired', 'TOKEN_EXPIRED');
    }

    // Set new password and activate the account
    const passwordHash = await hashPassword(password);
    await accountsQueries.updatePassword(client, invite.account_id, passwordHash);

    // Mark invite claimed
    await invitesQueries.markInviteClaimed(client, invite.id);

    return { message: 'Account activated successfully. You can now log in.' };
  });
}

export async function getMe(accountId) {
  const account = await accountsQueries.findAccountById(pool, accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  let profile = null;

  if (account.role === 'doctor') {
    const docRes = await pool.query(
      `SELECT d.*, dept.name as department_name 
       FROM doctors d 
       LEFT JOIN departments dept ON dept.id = d.department_id 
       WHERE d.account_id = $1`,
      [accountId]
    );
    profile = docRes.rows[0] || null;
  } else if (account.role === 'patient') {
    const patRes = await pool.query('SELECT * FROM patients WHERE account_id = $1', [accountId]);
    profile = patRes.rows[0] || null;
  }

  return {
    id: account.id,
    email: account.email,
    role: account.role,
    status: account.status,
    profile,
  };
}

export async function changePassword(accountId, { currentPassword, newPassword }) {
  const account = await accountsQueries.findAccountById(pool, accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const isMatch = await comparePassword(currentPassword, account.password_hash);
  if (!isMatch) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  const newHash = await hashPassword(newPassword);
  await accountsQueries.updatePassword(pool, accountId, newHash);

  return { message: 'Password changed successfully' };
}

export async function forgotPassword({ email }) {
  const account = await accountsQueries.findAccountByEmail(pool, email);

  // Return standard response even if account doesn't exist (prevents email enumeration)
  if (!account || account.status !== 'active') {
    return {
      message: 'If an account with that email exists, password reset instructions have been sent.',
    };
  }

  // Generate 1-hour expiring reset token
  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await invitesQueries.createInvite(pool, {
    accountId: account.id,
    tokenHash,
    expiresAt,
  });

  // Log in development console for testing
  console.log(`🔑 [Password Reset Token for ${email}]: ${rawToken}`);

  return {
    message: 'If an account with that email exists, password reset instructions have been sent.',
    resetToken: rawToken, // Convenient for local testing
  };
}

export async function resetPassword({ token, newPassword }) {
  return withTransaction(async (client) => {
    const tokenHash = hashToken(token);
    const invite = await invitesQueries.findInviteByTokenHash(client, tokenHash);

    if (!invite) {
      throw new NotFoundError('Reset token not found or invalid');
    }

    if (invite.claimed_at) {
      throw new ConflictError('This reset token has already been used', 'ALREADY_HANDLED');
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new UnauthorizedError('This reset token has expired', 'TOKEN_EXPIRED');
    }

    // Hash and update password
    const newHash = await hashPassword(newPassword);
    await accountsQueries.updatePassword(client, invite.account_id, newHash);

    // Mark claimed
    await invitesQueries.markInviteClaimed(client, invite.id);

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  });
}