import { withTransaction, pool } from '../db/pool.js';
import * as accountsQueries from '../db/queries/accounts.queries.js';
import * as invitesQueries from '../db/queries/invites.queries.js';
import * as doctorsQueries from '../db/queries/doctors.queries.js';
import * as departmentsQueries from '../db/queries/departments.queries.js';
import { generateRandomToken, hashToken } from './tokens.service.js';
import { ConflictError, NotFoundError } from '../errors/AppError.js';
import { handleDbError } from '../lib/dbErrors.js';
import * as appointmentsQueries from '../db/queries/appointments.queries.js';

export async function createDoctorWithInvite({ email, firstName, lastName, departmentId, specialization }) {
  return withTransaction(async (client) => {
    try {
      // 1. Verify department exists
      const dept = await departmentsQueries.findDepartmentById(client, departmentId);
      if (!dept) {
        throw new NotFoundError('Department not found');
      }

      // 2. Check duplicate email
      const existing = await accountsQueries.findAccountByEmail(client, email);
      if (existing) {
        throw new ConflictError('An account with this email already exists', 'EMAIL_IN_USE');
      }

      // 3. Create account with status 'invited'
      const account = await accountsQueries.createAccount(client, {
        email,
        passwordHash: null,
        role: 'doctor',
        status: 'invited',
      });

      // 4. Create doctor record
      await doctorsQueries.createDoctor(client, {
        accountId: account.id,
        departmentId,
        firstName,
        lastName,
        specialization,
      });

      // 5. Generate single-use invite token (expires in 48 hours)
      const rawInviteToken = generateRandomToken();
      const tokenHash = hashToken(rawInviteToken);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await invitesQueries.createInvite(client, {
        accountId: account.id,
        tokenHash,
        expiresAt,
      });
     

      return {
        message: 'Doctor account created and invite issued',
        account: { id: account.id, email: account.email, role: account.role },
        inviteToken: rawInviteToken, // In production, this would be emailed
        expiresAt,
      };
    } catch (err) {
      handleDbError(err);
    }
  });
}

export async function createStaffWithInvite({ email, role }) {
  return withTransaction(async (client) => {
    try {
      const existing = await accountsQueries.findAccountByEmail(client, email);
      if (existing) {
        throw new ConflictError('An account with this email already exists', 'EMAIL_IN_USE');
      }

      const account = await accountsQueries.createAccount(client, {
        email,
        passwordHash: null,
        role,
        status: 'invited',
      });

      const rawInviteToken = generateRandomToken();
      const tokenHash = hashToken(rawInviteToken);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await invitesQueries.createInvite(client, {
        accountId: account.id,
        tokenHash,
        expiresAt,
      });
      

      return {
        message: `${role} account created and invite issued`,
        account: { id: account.id, email: account.email, role: account.role },
        inviteToken: rawInviteToken,
        expiresAt,
      };
    } catch (err) {
      handleDbError(err);
    }
  });
}

export async function listAllAccounts(filters) {
  return accountsQueries.listAccounts(pool, filters);
}
export async function setAccountStatus(adminUser, targetAccountId, newStatus) {
  return withTransaction(async (client) => {
    const target = await accountsQueries.findAccountById(client, targetAccountId);
    if (!target) {
      throw new NotFoundError('Account not found');
    }
    // 1. The Last-Admin Protection Rule
    if (target.role === 'admin' && newStatus === 'deactivated') {
      const activeAdminCount = await accountsQueries.countActiveAdmins(client);
      if (activeAdminCount <= 1) {
        throw new ConflictError(
          'Cannot deactivate the last active administrator account',
          'LAST_ADMIN'
        );
      }
    }
    // 2. Update status
    const updated = await accountsQueries.updateAccountStatus(client, targetAccountId, newStatus);
    // 3. If a doctor is deactivated, automatically move all their future booked appointments to 'needs_reschedule'
    let affectedAppointments = [];
    if (target.role === 'doctor' && newStatus === 'deactivated') {
      affectedAppointments = await appointmentsQueries.flagDoctorFutureAppointmentsAsNeedsReschedule(
        client,
        targetAccountId
      );
    }
    return {
      account: updated,
      affectedAppointmentsCount: affectedAppointments.length,
      affectedAppointments,
    };
  });
}