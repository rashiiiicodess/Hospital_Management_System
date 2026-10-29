-- Up Migration

-- 1. Enable btree_gist extension (critical for exclusion constraints preventing double bookings)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Appointment Status Enum
CREATE TYPE appointment_status AS ENUM (
  'booked',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
  'needs_reschedule'
);

-- 3. Day of week enum
CREATE TYPE day_of_week AS ENUM (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

-- 4. Doctor Weekly Availability Template
CREATE TABLE doctor_availability_templates (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES doctors(account_id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_time_range CHECK (start_time < end_time)
);

-- 5. Doctor Date Overrides (leaves, holidays, or custom extra hours)
CREATE TABLE doctor_availability_overrides (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES doctors(account_id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_day_off BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_override_hours CHECK (
    (is_day_off = true) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

-- 6. Appointments Table (with Exclusion Constraints to prevent double booking)
CREATE TABLE appointments (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id INT NOT NULL REFERENCES doctors(account_id) ON DELETE RESTRICT,
  patient_id INT NOT NULL REFERENCES patients(account_id) ON DELETE RESTRICT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'booked',
  cancellation_reason TEXT,
  cancelled_by INT REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_appointment_times CHECK (start_time < end_time),

  -- Prevent doctor double booking for overlapping active appointments
  CONSTRAINT exclude_doctor_slot_overlap EXCLUDE USING gist (
    doctor_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('booked', 'checked_in')),

  -- Prevent patient double booking at the same time
  CONSTRAINT exclude_patient_slot_overlap EXCLUDE USING gist (
    patient_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (status IN ('booked', 'checked_in'))
);

CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, start_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Down Migration
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS doctor_availability_overrides;
DROP TABLE IF EXISTS doctor_availability_templates;
DROP TYPE IF EXISTS day_of_week;
DROP TYPE IF EXISTS appointment_status;