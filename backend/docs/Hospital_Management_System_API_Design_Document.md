# Hospital Management System – API Design Document

**Version 1.0 · Draft · October 28, 2026 · Companion to the HMS PRD**

---

## 1. Conventions

| Item | Rule |
|---|---|
| Base path | `/api/v1` (all endpoints below are relative to it) |
| Format | JSON requests and responses; all times in ISO 8601 with offset (stored as `timestamptz`) |
| Authentication | `Authorization: Bearer <access token>` (about 15 minutes). The rotating refresh token travels only in an httpOnly cookie |
| Validation | Every request body, query, and path parameter is validated with Zod before reaching a controller |
| IDs | UUIDs. The alias `me` can replace an ID where noted and resolves to the logged-in user |
| Pagination | `?page=1&limit=20`; list responses return `data`, `page`, `limit`, `total`. Sort keys are stable (created time plus id) |
| Priority | P0 must have, P1 should have, P2 nice to have (same scale as the PRD) |
| Audit | Every clinical record view or edit, status change, reschedule, and admin action writes an `audit_log` row |

---

## 2. Access Legend

Roles are mutually exclusive: one account has exactly one role. Receptionists and admins never have access to clinical data.

| Term | Meaning |
|---|---|
| Public | No login required |
| Any logged-in user | Valid access token, any role |
| Admin, Doctor, Receptionist, Patient | Only that role can call the endpoint |
| (own) | The caller may only touch resources that belong to them (their own appointments, profile, or records). Ownership is checked in the service layer on every request |
| (window) | Doctor access limited to the clinical access window: from 20 minutes before the appointment starts until its slot ends |

---

## 3. Authentication and Invites

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| POST | `/auth/register` | Public | Patient self-registration. Creates a patient account and its linked patient record. If an unclaimed walk-in record already uses the email, returns 409 asking the user to use their invite link instead | P0 |
| POST | `/auth/login` | Public | Email and password login. Returns an access token and sets the refresh cookie. Rate limited, with temporary lockout after repeated failures | P0 |
| POST | `/auth/refresh` | Public (refresh cookie) | Rotates the refresh token and returns a new access token. Reuse of an old refresh token revokes the whole token family | P0 |
| POST | `/auth/logout` | Any logged-in user | Revokes the current refresh token and clears the cookie | P0 |
| GET | `/auth/me` | Any logged-in user | Returns the current account, role, and role profile (doctor or patient) | P0 |
| POST | `/auth/change-password` | Any logged-in user | Changes the password after verifying the current one; revokes other sessions | P1 |
| POST | `/auth/forgot-password` | Public | Queues a reset email. Always returns the same response whether or not the email exists | P0 |
| POST | `/auth/reset-password` | Public (reset token) | Sets a new password using a single-use, expiring token | P0 |
| GET | `/invites/:token` | Public (invite token) | Checks that an invite is valid and unexpired. Returns only the invite type and a masked email | P0 |
| POST | `/invites/:token/accept` | Public (invite token) | Sets the password. Staff invite: activates the account. Patient claim: creates the account and links it to the existing patient record and history | P0 |

---

## 4. Users and Staff Management

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| GET | `/admin/users` | Admin | Lists accounts with filters for role, active status, and name or email search | P0 |
| GET | `/admin/users/:id` | Admin | Account details (no clinical data) | P0 |
| POST | `/admin/users/doctors` | Admin | Creates a doctor account and doctor profile (department, specialization), then emails an invite to set a password | P0 |
| POST | `/admin/users/staff` | Admin | Creates a receptionist or admin account and emails an invite. Staff cannot self-register | P0 |
| PATCH | `/admin/users/:id` | Admin | Updates name or contact details of an account | P1 |
| PATCH | `/admin/users/:id/status` | Admin | Activates or deactivates an account (soft, never deleted). Blocks deactivating the last active admin. Deactivating a doctor flags their future appointments as `needs_reschedule` | P0 |
| POST | `/admin/users/:id/resend-invite` | Admin | Sends a fresh invite to an account that has not set a password yet | P0 |

---

## 5. Departments and Doctors

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| GET | `/departments` | Any logged-in user | Lists active departments | P0 |
| POST | `/departments` | Admin | Creates a department | P0 |
| PATCH | `/departments/:id` | Admin | Renames or edits a department | P0 |
| DELETE | `/departments/:id` | Admin | Deletes a department. Rejected with a clear error if doctors are still assigned | P0 |
| GET | `/doctors` | Any logged-in user | Searches doctors by department and name (case-insensitive partial match). `sort=next_available` orders by the first open slot in the booking window. Paginated | P1 |
| GET | `/doctors/:id` | Any logged-in user | Doctor profile: department, specialization, qualifications, experience, bio, languages | P0 |
| PATCH | `/doctors/me` | Doctor | Edits own profile fields (bio, qualifications, experience, languages) | P1 |
| PATCH | `/doctors/:id` | Admin | Changes a doctor's department, specialization, or license number | P0 |

---

## 6. Availability and Slots

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| GET | `/doctors/:id/availability` | Doctor (own), Receptionist, Admin | Returns the weekly template and date overrides for a date range (`from`, `to`) | P0 |
| POST | `/doctors/me/availability/preview` | Doctor | Dry run for a proposed weekly change, day off, or custom hours. Returns how many booked appointments would be affected. Saves nothing | P0 |
| PUT | `/doctors/me/availability/weekly` | Doctor | Replaces the weekly template. If appointments are affected the body must include `confirm: true`; they are then flagged `needs_reschedule` in the same transaction and patients are emailed. Overlapping ranges are rejected | P0 |
| POST | `/doctors/me/overrides` | Doctor | Adds a date override: off (day off or leave) or working (custom hours or an extra session). Same affected-appointments confirmation as above | P0 |
| DELETE | `/doctors/me/overrides/:id` | Doctor | Removes an override, reverting that date to the weekly template. Same affected-appointments check | P0 |
| GET | `/doctors/:id/slots` | Any logged-in user | Open 20-minute slots (15 consultation plus 5 buffer) for a date or short range, computed from override-or-template minus booked slots. Past slots and slots beyond the 30-day window are never returned | P0 |

---

## 7. Appointments

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| POST | `/appointments` | Patient (self), Receptionist (any patient) | Books a slot. Revalidated server-side, then protected by database exclusion constraints. Conflicts return 409 `SLOT_TAKEN` or `PATIENT_OVERLAP`. Optional `followUpOf` links a follow-up to an earlier appointment. Queues a confirmation email in the same transaction | P0 |
| GET | `/appointments` | Patient (own), Doctor (own), Receptionist, Admin (read only) | Lists appointments, scoped by role, with filters for status, doctor, patient, and date range. Never includes clinical data | P0 |
| GET | `/appointments/:id` | Patient (own), Doctor (own), Receptionist, Admin | Appointment details: doctor, patient name, times, status, cancellation or reschedule info | P0 |
| POST | `/appointments/:id/cancel` | Patient (own, before start), Receptionist (before start), Doctor (own, before start) | Cancels with a reason (required for receptionist and doctor, optional for patient). Patient or receptionist cancellation frees the slot immediately. A checked-in appointment cannot be cancelled. A doctor's cancellation moves the appointment to `needs_reschedule` instead. The patient is emailed | P0 |
| POST | `/appointments/:id/reschedule` | Receptionist | Atomically moves the appointment to a new slot and returns it to `booked`. If the new slot is taken, the original stays unchanged. Patient is emailed | P0 |
| POST | `/appointments/:id/complete` | Doctor (own) | Marks the appointment completed, from `booked` or `checked_in`. Rejected unless a finalized visit record exists | P0 |
| POST | `/appointments/:id/no-show` | Doctor (own), Receptionist | Marks a no-show. Allowed only for a `booked` (not checked-in) appointment and only after the slot has ended | P0 |
| GET | `/appointments/:id/history` | Receptionist, Admin | Status change history for an appointment (who changed it, when, why) | P1 |
| GET | `/reschedule-queue` | Receptionist | Lists appointments in `needs_reschedule`, caused either by a doctor schedule change or a doctor cancellation | P0 |
| GET | `/reschedule-queue/:appointmentId/suggestions` | Receptionist | Returns the nearest open slots for the same doctor to offer the patient | P0 |
| POST | `/appointments/:id/check-in` | Receptionist | Marks the patient as arrived (`booked` to `checked_in`) on the appointment day, before the slot ends. Optional step: completion works with or without it. The doctor's list shows who has arrived | P2 |
| POST | `/appointments/:id/revert-no-show` | Receptionist, Doctor (own) | Reverts a wrongly marked no-show back to `booked`, with a required reason. The slot is still held, so the doctor can then complete it. Written to the audit log | P1 |

**Appointment status flow:** `booked` → `checked_in` (optional) → `completed`. A `booked` appointment can also go straight to `completed`. `booked` → `no_show` happens only after the slot ends, and `no_show` → `booked` only through revert-no-show. `needs_reschedule` → `booked` (rescheduled) or `cancelled`. `cancelled` and `completed` are final.

---

## 8. Patients

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| POST | `/patients` | Receptionist | Registers a walk-in patient without a login. Returns 409 with possible matches on duplicate email or phone unless `force: true`. If an email is given, can send an activation invite | P0 |
| GET | `/patients` | Receptionist, Admin | Searches patients by name, phone, or email. Demographics and contact only. Paginated | P0 |
| GET | `/patients/me` | Patient | Own full profile including medical profile fields | P0 |
| GET | `/patients/:id` | Receptionist (demographics), Admin (demographics), Doctor (window) | Patient details. Doctors also receive the medical profile (blood group, allergies, chronic conditions), but only inside the access window. Outside it, returns 403 `ACCESS_WINDOW_CLOSED` | P0 |
| PATCH | `/patients/:id` | Patient (own), Receptionist | Updates demographics and contact details. Changing an email requires re-verification | P1 |
| PATCH | `/patients/:id/medical-profile` | Doctor (window) | Updates allergies, chronic conditions, and blood group | P0 |
| POST | `/patients/:id/invite` | Receptionist | Sends or resends the account claim invite to a walk-in patient with an email | P0 |

---

## 9. Medical Records and Vitals

All endpoints in this section write to the audit log. Receptionists and admins always receive 403.

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| GET | `/patients/:id/history` | Patient (own), Doctor (window) | Full medical history: past visit records, vitals, and prescriptions. Loaded automatically for the doctor once the window opens. The 403 response includes when access opens | P0 |
| GET | `/appointments/:id/record` | Patient (own), Doctor (own, window or while a draft is open) | Visit record and vitals for one appointment | P0 |
| PUT | `/appointments/:id/vitals` | Doctor (own) | Creates or updates vitals (BP, pulse, temperature, weight, height, SpO2). Impossible values are rejected; unusual values return a warning | P0 |
| PUT | `/appointments/:id/record` | Doctor (own) | Creates or updates the draft visit record: complaint, diagnosis, notes, follow-up date. Editable until finalized, even after the window closes | P0 |
| POST | `/appointments/:id/record/finalize` | Doctor (own) | Finalizes the visit record so it becomes read-only. Required before the appointment can be completed | P0 |
| POST | `/appointments/:id/record/amendments` | Doctor (own) | Adds an amendment to a finalized record with a reason. The original content is never overwritten | P2 |

---

## 10. Prescriptions

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| PUT | `/appointments/:id/prescription` | Doctor (own) | Creates or replaces the prescription items (free text: medicine, dosage, frequency, duration, instructions). Returns a soft warning when a medicine name matches a recorded allergy | P0 |
| GET | `/appointments/:id/prescription` | Doctor (own), Patient (own) | Returns the active prescription with its items | P0 |
| GET | `/appointments/:id/prescription/pdf` | Doctor (own), Patient (own) | Downloads the prescription as a PDF with hospital name, doctor, patient, date, and prescription ID | P0 |
| POST | `/appointments/:id/prescription/revise` | Doctor (own) | Creates a corrected version and marks the old one superseded. The old PDF stays retrievable | P2 |
| GET | `/prescriptions` | Patient (own), Doctor (own issued) | Lists prescriptions, paginated. Patients see all of theirs; doctors see those they issued | P1 |
| GET | `/prescriptions/medicine-suggestions` | Doctor | Autocomplete (`?q=`) using only the doctor's own past medicine names | P2 |

The prescription email with the PDF attached is sent automatically when the visit record is finalized (no endpoint). The email contains no diagnosis.

---

## 11. Admin: Dashboard, Notifications, and Audit

| Method | Endpoint | Access | Description | Pri |
|---|---|---|---|---|
| GET | `/admin/stats/summary` | Admin | Cards: appointments today, upcoming this week, total patients, active doctors, pending reschedules | P1 |
| GET | `/admin/stats/appointments-over-time` | Admin | Appointment counts per day for 7, 30, or 90 days | P1 |
| GET | `/admin/stats/by-department` | Admin | Appointment counts grouped by department for the selected range | P1 |
| GET | `/admin/stats/by-status` | Admin | Appointment counts grouped by status for the selected range | P1 |
| GET | `/admin/notifications` | Admin | Lists email outbox rows, filterable by status. Used to find failed deliveries | P0 |
| POST | `/admin/notifications/:id/retry` | Admin | Requeues a failed email | P1 |
| GET | `/admin/audit-log` | Admin | Audit entries filterable by user, action, patient, and date. Paginated | P1 |
| GET | `/health` | Public | Liveness check that also confirms database connectivity | P0 |

---

## 12. Standard Error Responses

Every error uses one shape: `code`, `message`, and optional `fieldErrors`.

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body, query, or path failed Zod validation; includes field errors |
| 401 | `UNAUTHENTICATED` | Missing or invalid access token |
| 401 | `TOKEN_EXPIRED` | Access token expired; client should call `/auth/refresh` |
| 403 | `FORBIDDEN` | Role not allowed for this endpoint |
| 403 | `ACCESS_WINDOW_CLOSED` | Doctor requested history outside the access window; includes `opensAt` and `closesAt` |
| 404 | `NOT_FOUND` | Resource missing. Also returned instead of 403 when someone asks for another user's resource, so existence is not leaked |
| 409 | `SLOT_TAKEN` | Another booking took the slot first |
| 409 | `PATIENT_OVERLAP` | Patient already has an appointment at that time |
| 409 | `EMAIL_IN_USE` | Email already belongs to another account |
| 409 | `DUPLICATE_PATIENT` | Possible duplicate walk-in; response lists matches |
| 409 | `INVALID_TRANSITION` | Status change not allowed by the state machine |
| 409 | `ALREADY_HANDLED` | Another user resolved the same appointment first |
| 409 | `AFFECTS_APPOINTMENTS` | Schedule change affects booked appointments and needs `confirm: true` |
| 409 | `LAST_ADMIN` | Cannot deactivate the last active admin |
| 409 | `DEPARTMENT_HAS_DOCTORS` | Department cannot be deleted while doctors are assigned |
| 423 | `ACCOUNT_LOCKED` | Too many failed logins; includes when the lock ends |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded |

---

## 13. Implementation Notes

- **Route order:** register fixed paths such as `/patients/me`, `/reschedule-queue`, and `/prescriptions/medicine-suggestions` before parameterized routes like `/patients/:id`, or the parameter will swallow them.
- **Middleware order:** rate limit, authenticate, role check, validate, controller. Ownership and window checks live in services, never only in the frontend.
- **One access function:** the doctor clinical access window is checked by a single reusable function, with boundary tests (19, 20, and 21 minutes before; at and after slot end).
- **Transactions:** booking, reschedule, schedule changes that flag appointments, record finalization, and admin deactivation all run inside `withTransaction`. Outbox emails are inserted in the same transaction.
- **Concurrency:** double-booking is prevented by the database. The API only maps Postgres error 23P01 to `SLOT_TAKEN` or `PATIENT_OVERLAP`, 23505 to the matching duplicate error, and 23503 to a validation error.
- **Coverage:** every row marked P0 needs at least one test for its allowed role and one for a denied role.

---

## 14. Backend Folder Structure

The backend is plain JavaScript (ES modules, `"type": "module"` in `package.json`) with four main layers: routes, controllers, services, and db queries. Every file is named by domain, so a feature such as appointments appears once in each layer (`appointments.routes.js`, `appointments.controller.js`, `appointments.service.js`, `appointments.queries.js`).

### 14.1 Layer Rules

| Layer | What it does | May import | Must not |
|---|---|---|---|
| routes | Maps a URL and method to a middleware chain and a controller | middleware, controllers, validation schemas | Contain business logic or SQL |
| controllers | Reads validated input from the request, calls exactly one service function, picks the status code, shapes the response | services | Touch SQL, hold business rules, or call other controllers |
| services | All business rules: ownership and role checks, the state machine, the doctor access window, transactions, enqueueing emails, writing audit rows | db/queries, lib, errors, config, other services | Use `req` or `res` objects |
| db/queries | All SQL. Parameterized only. Every function takes a pool or a transaction client as its first argument | db/pool, lib/dbErrors | Hold business rules or know about HTTP |
| middleware | Cross-cutting request work: authenticate, role gate, validate, rate limit, error handling | lib, errors, services for loading the account | Hold domain rules |

Imports only flow one way: routes, then controllers, then services, then queries. A lower layer never imports a higher one.

### 14.2 Folder Tree

```
backend/
  package.json
  .env                      (never committed)
  .env.example              (every variable, with dummy values)
  src/
    server.js               (starts listening and the jobs)
    app.js                  (builds the Express app)
    config/
      env.js
      constants.js
    db/
      pool.js
      migrations/           (node-pg-migrate SQL files)
      seeds/
        seed.js
      queries/
        accounts.queries.js
        invites.queries.js
        refreshTokens.queries.js
        departments.queries.js
        doctors.queries.js
        availability.queries.js
        appointments.queries.js
        patients.queries.js
        records.queries.js
        prescriptions.queries.js
        notifications.queries.js
        audit.queries.js
        stats.queries.js
    routes/
      index.js
      auth.routes.js
      admin.routes.js
      departments.routes.js
      doctors.routes.js
      appointments.routes.js
      patients.routes.js
      records.routes.js
      prescriptions.routes.js
      health.routes.js
    controllers/
      auth.controller.js
      adminUsers.controller.js
      adminStats.controller.js
      adminOps.controller.js
      departments.controller.js
      doctors.controller.js
      availability.controller.js
      appointments.controller.js
      patients.controller.js
      records.controller.js
      prescriptions.controller.js
      health.controller.js
    services/
      auth.service.js
      tokens.service.js
      invites.service.js
      accounts.service.js
      departments.service.js
      doctors.service.js
      availability.service.js
      slots.service.js
      appointments.service.js
      appointmentStateMachine.js
      accessWindow.service.js
      patients.service.js
      records.service.js
      prescriptions.service.js
      notifications.service.js
      stats.service.js
      audit.service.js
    middleware/
      authenticate.js
      authorize.js
      validate.js
      rateLimit.js
      notFound.js
      errorHandler.js
    validation/
      common.schemas.js
      auth.schemas.js
      accounts.schemas.js
      departments.schemas.js
      doctors.schemas.js
      availability.schemas.js
      appointments.schemas.js
      patients.schemas.js
      records.schemas.js
      prescriptions.schemas.js
    jobs/
      index.js
      reminder.job.js
      emailOutbox.job.js
    lib/
      mailer.js
      emailTemplates.js
      pdf.js
      password.js
      time.js
      pagination.js
      dbErrors.js
    errors/
      AppError.js
  tests/
    setup.js
    helpers/
    unit/
    integration/
```

### 14.3 Root and Entry Files

| File | What happens in it |
|---|---|
| `package.json` | Scripts (`dev`, `migrate`, `migrate:down`, `migrate:create`, `test`, `start`), dependencies, and `type: module` |
| `.env.example` | Documents every setting: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, SMTP host, user and password, `HOSPITAL_TIMEZONE`, `PORT`, and `CLIENT_ORIGIN` |
| `src/app.js` | Builds and exports the Express app (without listening, so Supertest can import it). Registers Helmet, CORS, cookie-parser, JSON body parsing, morgan, mounts `/api/v1` routes, then the not-found and error handlers |
| `src/server.js` | Imports the app, starts listening on the port, starts the background jobs, and shuts down cleanly on SIGTERM (stops jobs, closes the pool) |

### 14.4 config/

| File | What happens in it |
|---|---|
| `env.js` | Loads `.env`, validates every variable with Zod, and exports a frozen config object. The app refuses to start if something is missing or malformed |
| `constants.js` | Single source of truth for fixed values: slot length (15 minutes consultation plus 5 buffer, 20 total), booking window (30 days), minimum booking lead time, clinical access window (20 minutes before start), lockout thresholds, role names, and appointment statuses |

### 14.5 db/

| File | What happens in it |
|---|---|
| `pool.js` | Creates the single `pg.Pool`, sets type parsers (for example numeric values), and exports `withTransaction(fn)` which runs BEGIN, COMMIT or ROLLBACK and always releases the client |
| `migrations/` | node-pg-migrate SQL files, applied in order (see 14.12). Each has an Up and a Down section |
| `seeds/seed.js` | Idempotent demo data: one account per role, departments, doctors with schedules, patients, and sample appointments. Safe to run repeatedly |
| `queries/accounts.queries.js` | Find by id or email, login lookup (the only query returning the password hash), create, update password, set active status, lock active admins for the last-admin check, list with filters |
| `queries/invites.queries.js` | Create an invite, find by token hash, mark used, invalidate older invites for the same target |
| `queries/refreshTokens.queries.js` | Store a hashed refresh token, find by hash, revoke one or a whole family, delete expired |
| `queries/departments.queries.js` | List, create, update, delete, count doctors in a department |
| `queries/doctors.queries.js` | Doctor profile reads and updates, search by department and name, join with accounts |
| `queries/availability.queries.js` | Weekly template and override reads and writes, and the query that finds booked appointments falling outside a proposed schedule |
| `queries/appointments.queries.js` | Insert, find by id, list with role-scoped filters, booked slots for a doctor and date range, status updates with conditional WHERE clauses, status event inserts, reschedule queue, reminder candidates |
| `queries/patients.queries.js` | Insert, find, search by name, phone or email, duplicate lookup, link an account to a patient, update demographics and medical profile |
| `queries/records.queries.js` | Visit record upsert and finalize, vitals upsert, amendments, and the full history for a patient |
| `queries/prescriptions.queries.js` | Insert a prescription with its items, find the active one, mark superseded, a doctor's past medicine names |
| `queries/notifications.queries.js` | Insert outbox rows, claim due rows with `FOR UPDATE SKIP LOCKED`, mark sent or failed, list failures, requeue |
| `queries/audit.queries.js` | Insert audit rows and filtered, paginated reads |
| `queries/stats.queries.js` | The aggregate queries for dashboard cards and the three charts |

### 14.6 routes/

| File | What happens in it |
|---|---|
| `index.js` | Creates the `/api/v1` router and mounts every domain router on it. Mount order matters: fixed paths before parameterized ones |
| `auth.routes.js` | `/auth/register`, `login`, `refresh`, `logout`, `me`, `change-password`, `forgot-password`, `reset-password`, and `/invites/:token` and its accept route. Login and reset routes get the strict rate limiter |
| `admin.routes.js` | Everything under `/admin`: users, stats, notifications, audit log. Applies `authenticate` and `authorize('admin')` once for the whole router |
| `departments.routes.js` | `/departments`: read for any logged-in user, write for admin |
| `doctors.routes.js` | `/doctors`, profile, availability, overrides, and slots |
| `appointments.routes.js` | `/appointments` and its actions (cancel, reschedule, check-in, complete, no-show, revert-no-show, history) plus `/reschedule-queue` |
| `patients.routes.js` | `/patients`, `/patients/me` (registered before `/:id`), medical profile, and invite |
| `records.routes.js` | `/patients/:id/history`, and `/appointments/:id/record`, `vitals`, `record/finalize`, `amendments` |
| `prescriptions.routes.js` | The prescription routes under an appointment, the PDF, `/prescriptions`, and medicine suggestions |
| `health.routes.js` | `GET /health`: checks the database with a trivial query |

Each route line reads like a sentence, for example: `router.post('/', authenticate, authorize('patient', 'receptionist'), validate(bookSchema), appointmentsController.book)`.

### 14.7 controllers/

Controllers stay thin: read `req.user`, `req.params`, and the validated `req.body` or `req.query`, call one service function, and send the response.

| File | What happens in it |
|---|---|
| `auth.controller.js` | Register, login (sets the refresh cookie), refresh, logout (clears cookie), me, password change and reset, invite verify and accept |
| `adminUsers.controller.js` | List and read accounts, create doctor and staff accounts, update, activate or deactivate, resend invite |
| `adminStats.controller.js` | The four stats endpoints |
| `adminOps.controller.js` | Outbox listing and retry, and the audit log viewer |
| `departments.controller.js` | Department list, create, update, delete |
| `doctors.controller.js` | Doctor search, profile read, own-profile edit, admin edit |
| `availability.controller.js` | Read availability, preview a change, save the weekly template, add or remove overrides, list slots |
| `appointments.controller.js` | Book, list, read, cancel, reschedule, check-in, complete, no-show, revert, history, and the reschedule queue and its suggestions |
| `patients.controller.js` | Register walk-in, search, read, update, medical profile update, send invite |
| `records.controller.js` | Patient history, read a visit record, save vitals, save the draft record, finalize, amend |
| `prescriptions.controller.js` | Save, read, revise, list, medicine suggestions, and streaming the PDF |
| `health.controller.js` | Returns status and a database check result |

### 14.8 services/

| File | What happens in it |
|---|---|
| `auth.service.js` | Registration, login with bcrypt compare, failed-attempt counting and lockout, refresh-token rotation with reuse detection, password change and reset |
| `tokens.service.js` | Signs and verifies JWT access tokens, generates refresh tokens, hashes tokens before they are stored |
| `invites.service.js` | Creates single-use expiring invites, verifies them, and on accept either activates a staff account or creates the account for a walk-in patient and links it to the existing record |
| `accounts.service.js` | Admin account management: creates doctors and staff with their invites, rejects duplicate emails (mapped from error 23505), deactivates accounts with the last-admin lock, and flags a deactivated doctor's future appointments |
| `departments.service.js` | Department rules, including refusing to delete a department that still has doctors |
| `doctors.service.js` | Doctor profiles and search, including the next-available-slot sort |
| `availability.service.js` | Validates weekly ranges and overrides, runs the preview, and on confirmed change flags affected appointments as `needs_reschedule` and queues patient emails, all in one transaction |
| `slots.service.js` | Computes open 20-minute slots from override-or-template minus booked appointments, and drops partial trailing slots. Used by search, booking validation, and reschedule suggestions |
| `appointments.service.js` | Booking (checks, insert, confirmation email, audit), cancel with the role rules, atomic reschedule, check-in, complete, no-show and revert, follow-ups, and the reschedule queue. Maps Postgres error 23P01 to `SLOT_TAKEN` or `PATIENT_OVERLAP` |
| `appointmentStateMachine.js` | A pure table of allowed transitions (for example booked to checked_in to completed, and no_show back to booked only by revert). Every status change goes through it. Easy to unit test |
| `accessWindow.service.js` | The single function that decides whether a doctor may read a patient's history right now (20 minutes before start until slot end, for booked, checked_in, and completed appointments) and returns when access opens. Used by every clinical endpoint |
| `patients.service.js` | Walk-in registration, duplicate detection that returns matches, demographic edits, medical profile edits gated by the access window |
| `records.service.js` | Patient history, vitals validation (reject impossible values, warn on unusual ones), the draft and finalize flow, amendments, and audit rows for every view |
| `prescriptions.service.js` | Saves items, produces the soft allergy warning, creates revisions, builds the PDF data, queues the prescription email on finalize, medicine suggestions from the doctor's own history |
| `notifications.service.js` | Chooses the template and inserts outbox rows. Called inside the same transaction as the action that triggers the email. Keeps clinical text out of payloads |
| `stats.service.js` | Applies the date range and shapes the query results for the dashboard |
| `audit.service.js` | One helper for writing audit rows (who, what, which patient, old and new values), used by all other services |

### 14.9 middleware/, validation/, errors/

| File | What happens in it |
|---|---|
| `middleware/authenticate.js` | Reads the Bearer token, verifies it, loads the account, rejects deactivated accounts, and sets `req.user` |
| `middleware/authorize.js` | `authorize(...roles)` returns a middleware that responds 403 if `req.user.role` is not listed |
| `middleware/validate.js` | `validate(schema)` parses body, query, and params with Zod and replaces them with the cleaned values, or returns `VALIDATION_ERROR` with field errors |
| `middleware/rateLimit.js` | A general limiter and a strict limiter for login, forgot-password, and invite endpoints |
| `middleware/notFound.js` | Returns the standard `NOT_FOUND` shape for unknown routes |
| `middleware/errorHandler.js` | The last middleware. Turns an `AppError` into the standard error response, maps stray Postgres error codes, and hides internals for unexpected errors |
| `validation/common.schemas.js` | Reusable pieces: UUID, pagination, ISO date and time, normalized email, phone |
| `validation/*.schemas.js` | One Zod schema file per domain (auth, accounts, departments, doctors, availability, appointments, patients, records, prescriptions) holding the exact request shapes from this document |
| `errors/AppError.js` | Base error with HTTP status and a code, plus small subclasses such as ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, and ConflictError. Services throw these |

### 14.10 jobs/ and lib/

| File | What happens in it |
|---|---|
| `jobs/index.js` | Registers the node-cron schedules and exports a stop function for shutdown |
| `jobs/reminder.job.js` | Runs every 15 minutes. Finds booked appointments about 24 hours away with no reminder, enqueues the email, sets `reminder_sent_at`, and skips anything already started or cancelled. Row locking keeps overlapping runs from double-sending |
| `jobs/emailOutbox.job.js` | Claims due outbox rows with `FOR UPDATE SKIP LOCKED`, re-checks the appointment status, sends through Nodemailer, retries with backoff, and marks rows failed after the maximum attempts |
| `lib/mailer.js` | Creates the Nodemailer transport from env settings |
| `lib/emailTemplates.js` | One function per email: confirmation, reminder, cancellation, reschedule notice, needs-reschedule notice, prescription, invite, and password reset. No clinical details |
| `lib/pdf.js` | Builds the prescription PDF with PDFKit: hospital name, doctor, patient, date, prescription ID, and the items table |
| `lib/password.js` | Thin wrappers around bcrypt hash and compare |
| `lib/time.js` | Luxon helpers for the hospital timezone, slot arithmetic, and the access window boundaries |
| `lib/pagination.js` | Turns page and limit into SQL limit and offset, and builds the paginated response |
| `lib/dbErrors.js` | Maps Postgres codes (23P01, 23505, 23503) and constraint names to application errors |

### 14.11 tests/

| Location | What happens there |
|---|---|
| `setup.js` | Points tests at a separate test database, migrates it fresh, and cleans tables between tests |
| `helpers/` | Factories for accounts, doctors, patients, and appointments, and a helper that logs in as each role |
| `unit/` | Pure logic tests: `appointmentStateMachine`, `accessWindow` boundaries (19, 20, and 21 minutes before; at and after slot end), slots generation, and vitals validation |
| `integration/` | API tests with Supertest: the double-booking race (10 simultaneous requests, exactly 1 success), role and ownership checks for every P0 endpoint, reschedule queue flow, reminder idempotency, and last-admin protection |

### 14.12 Migration Order

Migrations only reference tables that already exist, so they run in this order.

| Order | Migration | Contents | Status |
|---|---|---|---|
| 1 | `init-core-tables` | `set_updated_at`, role enum, accounts, departments, doctors, patients | Done |
| 2 | `add-invites` | Invite type enum and invites table | Done |
| 3 | `add-availability` | Weekly office hours, availability overrides, overlap rules | Planned |
| 4 | `add-appointments` | `btree_gist`, status enum, appointments with both exclusion constraints, status events, indexes, delete protection | Planned |
| 5 | `add-checked-in-status` | Adds the `checked_in` enum value (its own migration) | Planned |
| 6 | `add-checked-in-columns` | `checked_in_at`, `checked_in_by`, and the check constraint | Planned |
| 7 | `add-medical-records` | Medical records, amendments, vitals | Planned |
| 8 | `add-prescriptions` | Prescriptions and prescription items | Planned |
| 9 | `add-notifications` | Email outbox | Planned |
| 10 | `add-audit-log` | Append-only audit log | Planned |
| 11 | `add-refresh-tokens` | Refresh token storage with family ids | Planned |
| 12 | `add-account-lockout` | `failed_login_count`, `locked_until`, `last_login_at` on accounts | Planned |

### 14.13 Example Request Flow: Booking an Appointment

1. `POST /api/v1/appointments` enters `app.js`, then the router in `appointments.routes.js`.
2. Middleware runs in order: rate limit, `authenticate`, `authorize('patient', 'receptionist')`, then `validate(bookSchema)`.
3. `appointments.controller.js` calls `appointmentsService.book(req.user, req.body)`.
4. The service opens `withTransaction`, confirms the slot is offered (`slots.service.js`), confirms a patient is only booking for themselves, inserts via `appointments.queries.js`, writes the status event, queues the confirmation email through `notifications.service.js`, and writes an audit row.
5. If another request took the slot first, Postgres raises 23P01. `lib/dbErrors.js` maps it to a ConflictError with code `SLOT_TAKEN`, and `errorHandler.js` returns HTTP 409.
6. On success the controller returns 201 with the new appointment, and the outbox job delivers the email shortly after.
