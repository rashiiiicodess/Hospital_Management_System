import { ConflictError } from '../errors/AppError.js';
import { APPOINTMENT_STATUS } from '../config/constants.js';

/**
 * Valid state transitions table:
 * - booked -> checked_in, completed, cancelled, no_show, needs_reschedule
 * - checked_in -> completed, cancelled
 * - needs_reschedule -> booked, cancelled
 * - no_show -> booked (only via revert)
 * - completed & cancelled are terminal
 */
const ALLOWED_TRANSITIONS = {
  [APPOINTMENT_STATUS.BOOKED]: [
    APPOINTMENT_STATUS.CHECKED_IN,
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
    APPOINTMENT_STATUS.NEEDS_RESCHEDULE,
  ],
  [APPOINTMENT_STATUS.CHECKED_IN]: [
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
  ],
  [APPOINTMENT_STATUS.NEEDS_RESCHEDULE]: [
    APPOINTMENT_STATUS.BOOKED,
    APPOINTMENT_STATUS.CANCELLED,
  ],
  [APPOINTMENT_STATUS.NO_SHOW]: [
    APPOINTMENT_STATUS.BOOKED, // Revert no-show
  ],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
};

/**
 * Validates whether an appointment status transition is allowed.
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @throws {ConflictError} if transition is illegal
 */
export function assertValidTransition(currentStatus, nextStatus) {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new ConflictError(
      `Cannot transition appointment status from '${currentStatus}' to '${nextStatus}'`,
      'INVALID_TRANSITION'
    );
  }
}