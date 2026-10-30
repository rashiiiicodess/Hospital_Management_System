-- Up Migration
-- 1. If appointments references patients(account_id), drop that constraint temporarily
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey;

-- 2. Modify patients table to have its own auto-incrementing id
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_pkey;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY;
ALTER TABLE patients ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE patients ADD CONSTRAINT patients_account_id_unique UNIQUE (account_id);

-- 3. Re-link appointments(patient_id) to accounts(id) (since appointments store account_id)
ALTER TABLE appointments 
  ADD CONSTRAINT appointments_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES accounts(id) ON DELETE RESTRICT;

-- Down Migration
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_pkey;
ALTER TABLE patients DROP COLUMN IF EXISTS id;
ALTER TABLE patients ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE patients ADD PRIMARY KEY (account_id);