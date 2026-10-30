import { assertValidTransition } from '../../src/services/appointmentStateMachine.js';
import { APPOINTMENT_STATUS } from '../../src/config/constants.js';
import { ConflictError } from '../../src/errors/AppError.js';

describe('Appointment State Machine', () => {
  describe('Valid Transitions', () => {
    test('booked can transition to checked_in', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.BOOKED, APPOINTMENT_STATUS.CHECKED_IN);
      }).not.toThrow();
    });

    test('booked can transition to cancelled', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.BOOKED, APPOINTMENT_STATUS.CANCELLED);
      }).not.toThrow();
    });

    test('booked can transition to needs_reschedule', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.BOOKED, APPOINTMENT_STATUS.NEEDS_RESCHEDULE);
      }).not.toThrow();
    });

    test('checked_in can transition to completed', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.COMPLETED);
      }).not.toThrow();
    });

    test('needs_reschedule can transition back to booked on reschedule', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.NEEDS_RESCHEDULE, APPOINTMENT_STATUS.BOOKED);
      }).not.toThrow();
    });

    test('no_show can be reverted to booked', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.NO_SHOW, APPOINTMENT_STATUS.BOOKED);
      }).not.toThrow();
    });
  });

  describe('Illegal Transitions', () => {
    test('completed cannot transition to anything (terminal state)', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.BOOKED);
      }).toThrow(ConflictError);
    });

    test('cancelled cannot transition to completed', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.COMPLETED);
      }).toThrow(ConflictError);
    });

    test('checked_in cannot jump directly to needs_reschedule', () => {
      expect(() => {
        assertValidTransition(APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.NEEDS_RESCHEDULE);
      }).toThrow(ConflictError);
    });
  });
});

