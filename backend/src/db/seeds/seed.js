import { pool } from '../pool.js';
import { hashPassword } from '../../lib/password.js';

async function seed() {
  console.log('🌱 Starting comprehensive database seed...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Departments
    console.log('📁 Seeding departments...');
    const departments = [
      'Cardiology',
      'Orthopedics',
      'General Medicine',
      'Pediatrics',
      'Neurology',
    ];
    const deptMap = {};
    for (const name of departments) {
      const res = await client.query(
        `INSERT INTO departments (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, name;`,
        [name]
      );
      deptMap[name] = res.rows[0].id;
    }

    // 2. Admin Account
    console.log('👑 Seeding admin account...');
    const adminPasswordHash = await hashPassword('AdminPassword123!');
    await client.query(
      `INSERT INTO accounts (email, password_hash, role, status)
       VALUES ('admin@hospital.com', $1, 'admin', 'active')
       ON CONFLICT (email) DO UPDATE SET status = 'active';`,
      [adminPasswordHash]
    );

    // 3. Receptionist Account
    console.log('🛎️ Seeding receptionist account...');
    const receptionPasswordHash = await hashPassword('ReceptionSecret123!');
    await client.query(
      `INSERT INTO accounts (email, password_hash, role, status)
       VALUES ('reception@hospital.com', $1, 'receptionist', 'active')
       ON CONFLICT (email) DO UPDATE SET status = 'active';`,
      [receptionPasswordHash]
    );

    // 4. Doctors
    console.log('🩺 Seeding doctors...');
    const doctorPasswordHash = await hashPassword('DoctorSecretPass123!');
    const doctorsData = [
      {
        email: 'dr.smith@hospital.com',
        firstName: 'Alice',
        lastName: 'Smith',
        dept: 'Cardiology',
        specialization: 'Cardiologist',
        bio: 'Senior Interventional Cardiologist with 12+ years experience in cardiac imaging and coronary care.',
        qualifications: 'MD, DM (Cardiology), FACC',
        experienceYears: 12,
        languages: 'English, Hindi',
      },
      {
        email: 'dr.jones@hospital.com',
        firstName: 'Bob',
        lastName: 'Jones',
        dept: 'Orthopedics',
        specialization: 'Orthopedic Surgeon',
        bio: 'Consultant Orthopedic Surgeon specializing in arthroscopy, sports trauma, and joint reconstruction.',
        qualifications: 'MS (Orthopedics), MCh',
        experienceYears: 8,
        languages: 'English',
      },
      {
        email: 'dr.emily@hospital.com',
        firstName: 'Emily',
        lastName: 'Davis',
        dept: 'General Medicine',
        specialization: 'Internal Medicine Specialist',
        bio: 'Senior Consultant Physician with comprehensive expertise in chronic disease management and lifestyle medicine.',
        qualifications: 'MD (Internal Medicine), MRCP',
        experienceYears: 15,
        languages: 'English, Spanish',
      },
    ];

    const doctorMap = {};
    for (const doc of doctorsData) {
      let accRes = await client.query('SELECT id FROM accounts WHERE email = $1', [doc.email]);
      let accId;
      if (accRes.rows.length === 0) {
        const ins = await client.query(
          `INSERT INTO accounts (email, password_hash, role, status)
           VALUES ($1, $2, 'doctor', 'active')
           RETURNING id;`,
          [doc.email, doctorPasswordHash]
        );
        accId = ins.rows[0].id;
      } else {
        accId = accRes.rows[0].id;
        await client.query(`UPDATE accounts SET status = 'active', password_hash = $1 WHERE id = $2`, [
          doctorPasswordHash,
          accId,
        ]);
      }

      await client.query(
        `INSERT INTO doctors (account_id, department_id, first_name, last_name, specialization, bio, qualifications, experience_years, languages)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (account_id) DO UPDATE SET
           department_id = EXCLUDED.department_id,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           specialization = EXCLUDED.specialization,
           bio = EXCLUDED.bio,
           qualifications = EXCLUDED.qualifications,
           experience_years = EXCLUDED.experience_years,
           languages = EXCLUDED.languages;`,
        [
          accId,
          deptMap[doc.dept],
          doc.firstName,
          doc.lastName,
          doc.specialization,
          doc.bio,
          doc.qualifications,
          doc.experienceYears,
          doc.languages,
        ]
      );
      doctorMap[doc.email] = accId;
    }

    // 5. Doctor Weekly Schedules (Mon-Fri 09:00-13:00, 14:00-17:00)
    console.log('⏰ Seeding doctor availability templates...');
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    for (const docId of Object.values(doctorMap)) {
      // Clear existing templates for clean state
      await client.query('DELETE FROM doctor_availability_templates WHERE doctor_id = $1', [docId]);
      for (const day of days) {
        await client.query(
          `INSERT INTO doctor_availability_templates (doctor_id, day_of_week, start_time, end_time)
           VALUES ($1, $2, '09:00', '13:00'),
                  ($1, $2, '14:00', '17:00');`,
          [docId, day]
        );
      }
    }

    // 6. Patients
    console.log('🧑‍🤝‍🧑 Seeding registered and walk-in patients...');
    const patientPasswordHash = await hashPassword('PatientPass123!');

    // Registered patient 1: Sarah Connor
    let sarahAcc = await client.query('SELECT id FROM accounts WHERE email = $1', ['sarah.connor@example.com']);
    let sarahAccId;
    if (sarahAcc.rows.length === 0) {
      const ins = await client.query(
        `INSERT INTO accounts (email, password_hash, role, status)
         VALUES ('sarah.connor@example.com', $1, 'patient', 'active')
         RETURNING id;`,
        [patientPasswordHash]
      );
      sarahAccId = ins.rows[0].id;
    } else {
      sarahAccId = sarahAcc.rows[0].id;
    }

    const sarahPat = await client.query(
      `INSERT INTO patients (account_id, first_name, last_name, phone, date_of_birth, blood_group, allergies, chronic_conditions, emergency_contact)
       VALUES ($1, 'Sarah', 'Connor', '+1987654321', '1995-08-20', 'O+', 'Penicillin', 'None', '+1987654399')
       ON CONFLICT (account_id) DO UPDATE SET
         blood_group = EXCLUDED.blood_group,
         allergies = EXCLUDED.allergies
       RETURNING id;`,
      [sarahAccId]
    );
    const sarahPatientId = sarahPat.rows[0].id;

    // Walk-in patient 1: Robert Brown
    let robertRes = await client.query('SELECT id FROM patients WHERE phone = $1', ['+15551234567']);
    let robertPatientId;
    if (robertRes.rows.length === 0) {
      const robertPat = await client.query(
        `INSERT INTO patients (account_id, first_name, last_name, phone, date_of_birth, blood_group, allergies, chronic_conditions, emergency_contact)
         VALUES (NULL, 'Robert', 'Brown', '+15551234567', '1988-11-23', 'B+', 'Aspirin', 'Asthma', '+15559998888')
         RETURNING id;`
      );
      robertPatientId = robertPat.rows[0].id;
    } else {
      robertPatientId = robertRes.rows[0].id;
    }

    // 7. Sample Appointments
    console.log('📅 Seeding sample appointments across statuses...');
    const drSmithId = doctorMap['dr.smith@hospital.com'];

    // Appointment 1: Completed consultation with full clinical record & prescription
    const pastStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    pastStart.setHours(10, 0, 0, 0);
    const pastEnd = new Date(pastStart.getTime() + 20 * 60 * 1000);

    const appt1 = await client.query(
      `INSERT INTO appointments (doctor_id, patient_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, 'completed')
       RETURNING id;`,
      [drSmithId, sarahPatientId, pastStart.toISOString(), pastEnd.toISOString()]
    );
    const appt1Id = appt1.rows[0].id;

    // Vitals for Appt 1
    await client.query(
      `INSERT INTO patient_vitals (appointment_id, blood_pressure_systolic, blood_pressure_diastolic, pulse_rate, temperature_celsius, spo2_percentage, weight_kg, height_cm)
       VALUES ($1, 118, 78, 70, 36.6, 99, 64, 168)
       ON CONFLICT (appointment_id) DO NOTHING;`,
      [appt1Id]
    );

    // Medical Record for Appt 1
    const medRec = await client.query(
      `INSERT INTO medical_records (appointment_id, patient_id, doctor_id, chief_complaint, diagnosis, clinical_notes, is_finalized, finalized_at)
       VALUES ($1, $2, $3, 'Annual cardiac routine checkup', 'Normal sinus rhythm, healthy cardiac baseline', 'Patient is advised to maintain regular aerobic exercise and low sodium diet.', true, NOW())
       ON CONFLICT (appointment_id) DO NOTHING
       RETURNING id;`,
      [appt1Id, sarahPatientId, drSmithId]
    );

    // Prescription for Appt 1
    if (medRec.rows.length > 0) {
      const rx = await client.query(
        `INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, notes)
         VALUES ($1, $2, $3, 'Take with plenty of water after meals.')
         RETURNING id;`,
        [appt1Id, drSmithId, sarahPatientId]
      );
      await client.query(
        `INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, instructions)
         VALUES ($1, 'Multivitamin', '1 tablet', 'Once daily', '30 days', 'After breakfast'),
                ($1, 'Omega-3 Fish Oil', '1000mg', 'Once daily', '60 days', 'With evening meal');`,
        [rx.rows[0].id]
      );
    }

    // Appointment 2: Needs Reschedule (showcases receptionist reschedule queue!)
    const queueStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    queueStart.setHours(15, 0, 0, 0);
    const queueEnd = new Date(queueStart.getTime() + 20 * 60 * 1000);

    await client.query(
      `INSERT INTO appointments (doctor_id, patient_id, start_time, end_time, status, cancellation_reason)
       VALUES ($1, $2, $3, $4, 'needs_reschedule', 'Doctor attending emergency surgical procedure')
       ON CONFLICT DO NOTHING;`,
      [drSmithId, robertPatientId, queueStart.toISOString(), queueEnd.toISOString()]
    );

    await client.query('COMMIT');

    console.log('\n======================================================');
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('🔐 Accounts Available for Demo:');
    console.log('   👑 Admin:        admin@hospital.com       / AdminPassword123!');
    console.log('   🛎️ Receptionist: reception@hospital.com   / ReceptionSecret123!');
    console.log('   🩺 Cardiologist: dr.smith@hospital.com    / DoctorSecretPass123!');
    console.log('   🩺 Orthopedic:   dr.jones@hospital.com    / DoctorSecretPass123!');
    console.log('   🩺 Physician:    dr.emily@hospital.com    / DoctorSecretPass123!');
    console.log('   🧑 Patient:      sarah.connor@example.com / PatientPass123!');
    console.log('======================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
