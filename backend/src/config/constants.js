export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
  PATIENT: 'patient',
});

export const APPOINTMENT_STATUS = Object.freeze({
  BOOKED: 'booked',
  CHECKED_IN: 'checked_in',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  NEEDS_RESCHEDULE: 'needs_reschedule',
});

export const APPOINTMENT_CONFIG = Object.freeze({
  CONSULTATION_MINUTES: 15,
  BUFFER_MINUTES: 5,
  SLOT_DURATION_MINUTES: 20, // 15 + 5
  BOOKING_WINDOW_DAYS: 30,
  CLINICAL_ACCESS_WINDOW_BEFORE_MINUTES: 20,
});

export const AUTH_CONFIG = Object.freeze({
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  REFRESH_TOKEN_COOKIE_NAME: 'refreshToken',
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCKOUT_MINUTES: 15,
  SALT_ROUNDS: 10,
});