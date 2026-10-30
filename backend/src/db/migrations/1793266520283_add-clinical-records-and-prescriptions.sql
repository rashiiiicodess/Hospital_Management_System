-- Up Migration

-- 1. Medical Records / Visit Notes
CREATE TABLE medical_records (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
  patient_id INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  doctor_id INT NOT NULL REFERENCES doctors(account_id) ON DELETE RESTRICT,
  chief_complaint TEXT NOT NULL,
  diagnosis TEXT,
  clinical_notes TEXT,
  follow_up_date DATE,
  is_finalized BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Patient Vitals
CREATE TABLE patient_vitals (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  pulse_rate INT,
  temperature_celsius NUMERIC(4, 1),
  spo2_percentage INT,
  weight_kg NUMERIC(5, 2),
  height_cm NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Prescriptions
CREATE TABLE prescriptions (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
  doctor_id INT NOT NULL REFERENCES doctors(account_id) ON DELETE RESTRICT,
  patient_id INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Prescription Items
CREATE TABLE prescription_items (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  prescription_id INT NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration VARCHAR(100) NOT NULL,
  instructions TEXT
);

-- 5. Audit Log (tracks every clinical record access)
CREATE TABLE audit_logs (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INT NOT NULL REFERENCES accounts(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id INT,
  patient_id INT REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_patient ON audit_logs(patient_id);

-- Down Migration
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS prescription_items;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS patient_vitals;
DROP TABLE IF EXISTS medical_records;