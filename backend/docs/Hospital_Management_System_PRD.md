# Hospital Management System – Product Requirements Document

**Version 1.0 · Draft for review · October 25, 2026**

---

## 1. Metadata & Header

| Field | Detail |
|---|---|
| Product | Hospital Management System (HMS) |
| Document owner | [Your name], sole developer |
| Status | Draft – Under Review |
| Target release | [Date], about 8 weeks from kickoff (suggested: December 20, 2026) |
| Stakeholders | Developer (owner); project guide or supervisor (approver); academic evaluators (reviewers); demo audience |
| Stack | PERN: PostgreSQL, Express, React, Node, all in plain JavaScript (ES modules); node-pg + node-pgmigrate |
| Related docs | Wireframes and ER diagram (see Section 10) |

---

## 2. Overview & Context

**Elevator pitch.** HMS is a web application that connects patients, doctors, receptionists, and administrators in one system. Patients and staff book appointments that can never be double-booked, doctors record visits and issue prescriptions, and the system sends automatic email reminders.

**Background.** Small and mid-sized clinics often run on paper registers, phone calls, and spreadsheets. This causes clashing appointments, lost records, and missed visits. Healthcare software also demands strict access control, reliable data, and a clear audit trail, which makes it a strong test of backend design.

**Why now.** This is a final-year academic project with a fixed 8-week solo timeline. The scope is deliberately chosen to showcase relational schema design, concurrency-safe booking, role-based security, and background jobs, rather than breadth of features.

---

## 3. Problem & Opportunity Statement

### Problems

- Patients cannot see real availability, so they call or visit to book, and they forget appointments.
- Receptionists juggle phone bookings, walk-ins, and rescheduling by hand, with a high risk of two people booked into the same slot.
- Doctors lack a quick view of their day and a structured place to store notes and prescriptions, and they cannot easily change their own hours or cancel an appointment they cannot attend.
- Administrators have no overview of load, no-shows, or who accessed sensitive data.

**Opportunity.** One centralized system with a correct data model can remove double-booking, reduce no-shows through reminders, keep clinical data private by role, and give management basic visibility.

**Evidence note.** No primary research has been done. The problem statements reflect common clinic workflows and should be validated with one short interview with a real clinic receptionist if possible (see Open Questions).

---

## 4. Target Personas & Jobs-To-Be-Done

| Persona | Who they are | Jobs-To-Be-Done |
|---|---|---|
| Patient | Adult who needs care; may self-register or be registered at the desk | Find the right doctor and book a time without calling; get reminded; see my past visits and prescriptions; cancel or rebook easily |
| Receptionist | Front-desk staff handling calls and walk-ins | Register walk-in patients fast; book, cancel, and reschedule for patients; clear the queue of appointments disrupted by doctor schedule changes |
| Doctor | Clinician with a department and working hours | Control my own availability; cancel my own appointments when I cannot attend; see today's patients; record visit notes, vitals, and prescriptions; book a follow-up |
| Administrator | Hospital manager or IT admin | Onboard doctors and receptionists; organize departments; see utilization trends; review who accessed what |

---

## 5. Goals & Success Metrics

### Goals

1. Make double-booking impossible at the database level.
2. Enforce strict role-based access to every record.
3. Reduce no-shows with reliable automated reminders.
4. Deliver a complete, demonstrable system for all four roles within 8 weeks.

### Success Metrics

| Metric | Target | How measured |
|---|---|---|
| Double bookings under concurrency | 0 across a test of 10 simultaneous requests for one slot (exactly 1 succeeds, 9 get 409) | Automated race test |
| Overlapping appointments created for one patient | 0 | Constraint plus test |
| Endpoints with role and ownership tests | 100% of protected endpoints | Test suite report |
| Reminder delivery | At least 95% of due reminders queued within 15 minutes of the 24-hour mark; none sent twice | Outbox table audit in demo |
| Booking time for a patient (login to confirmation) | Under 60 seconds | Manual usability run with 3 testers |
| API performance | p95 under 300 ms on seed data of 10,000 appointments | Load script |
| Core logic test coverage | At least 70% on services (booking, slot generation, state machine, access rules) | Vitest coverage |
| Demo readiness | All P0 flows work end to end with seeded data for all 4 roles | Demo checklist |

---

## 6. User Scenarios & Critical User Journeys

### CUJ 1: Patient self-books an appointment

1. Patient registers with email and password, then logs in.
2. Searches doctors by department or name, sorted by next available slot.
3. Opens a doctor, picks a date, and sees open 20-minute slots.
4. Selects a slot and confirms.
5. System books the slot, shows confirmation, and queues a confirmation email.
6. If another patient took the slot first, the patient sees a clear message, the slots refresh, and they pick another time.

### CUJ 2: Receptionist registers a walk-in and books

1. Searches for the patient by name, phone, or email; creates a new record if none exists (duplicates are flagged).
2. If an email is entered, the system sends an activation invite so the patient can later claim the account.
3. Receptionist books the patient into a slot with the chosen doctor.

### CUJ 3: Doctor changes schedule, receptionist resolves fallout

1. Doctor adds a day-off override or changes weekly hours.
2. System warns: this affects N booked appointments. Doctor confirms.
3. Affected appointments become `needs_reschedule` and keep their slots until resolved; patients are emailed.
4. Receptionist opens the Needs rescheduling queue, picks a suggested new slot, and confirms; the old slot is released atomically and the patient is emailed.

### CUJ 3b: Doctor cancels an appointment

1. Doctor opens an upcoming appointment, chooses Cancel, and enters a required reason.
2. The appointment moves to `needs_reschedule` and the patient is emailed.
3. The receptionist finds it in the Needs rescheduling queue, offers new slots, and either reschedules it or cancels it for good.

### CUJ 4: Doctor completes a visit

1. Doctor opens today's list and selects the patient.
2. Reviews profile (allergies, chronic conditions) and past visits, which become available 20 minutes before the slot and stay available until it ends.
3. Records vitals and visit notes, adds prescription items, optionally sets a follow-up date.
4. Finalizes the visit; appointment becomes `completed`; prescription PDF is generated and emailed to the patient.

### CUJ 5: Automated reminder

1. A scheduled job finds appointments about 24 hours away with no reminder sent.
2. It enqueues an email, marks the reminder as sent, and the worker delivers it with retries on failure.

### CUJ 6: Administrator onboarding and oversight

1. Admin creates departments and doctor accounts; the doctor receives an invite to set a password.
2. Admin views dashboard cards and charts, and reviews the audit log.

### CUJ 7: Follow-up booking

1. Patient sees a Book follow-up button from a finalized visit.
2. The booking flow opens pre-filled with the same doctor and nearest available slots.

---

## 7. Functional Requirements & Prioritization

**Priority legend:** P0 = must have for release; P1 = should have; P2 = nice to have if time allows.

### 7.1 Authentication, Accounts & Roles

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| AUTH-1 | Four roles: admin, doctor, receptionist, patient. One account has exactly one role. | P0 | Role is a single field; role cannot be set via any request body by a non-admin |
| AUTH-2 | Email is unique across all users (normalized: trimmed, lowercased) | P0 | Duplicate email across any role is rejected with a generic message |
| AUTH-3 | Login with short-lived JWT access token and rotating refresh token in an httpOnly cookie | P0 | Expired access token refreshes silently; reused refresh token is rejected and revoked |
| AUTH-4 | Patients can self-register | P0 | New patient account is created with role patient and linked patient record |
| AUTH-5 | Receptionist can create patient records without login (walk-ins) | P0 | Patient record exists with no user; email optional |
| AUTH-6 | Activation invite: if an email is given, patient can claim the record by setting a password | P0 | Link is single-use and expires; claiming links the existing history to the new user |
| AUTH-7 | Admin creates doctor and receptionist accounts via invite email | P0 | Staff cannot self-register |
| AUTH-8 | Password reset by email | P0 | Reset link is single-use and expires |
| AUTH-9 | Login rate limiting and temporary lockout after repeated failures | P0 | Lockout triggers after configured attempts and expires automatically |
| AUTH-10 | Admin can deactivate users (soft); the last active admin cannot be deactivated | P0 | Deactivated user cannot log in; history stays intact |
| AUTH-11 | Duplicate patient detection by email or phone on registration | P1 | Receptionist is warned and can open the existing record |

### 7.2 Departments, Doctors & Search

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| DOC-1 | Admin manages departments (create, edit); a department with doctors cannot be deleted | P0 | Delete attempt returns a clear error listing the blocker |
| DOC-2 | Each doctor belongs to a department and has specialization, qualifications, experience, bio | P0 | Fields validated with length limits |
| DOC-3 | Doctor search by department and name (case-insensitive partial match), with pagination | P1 | Results paginated with a stable sort; empty state shown |
| DOC-4 | Search results can be sorted by next available slot | P1 | First open slot within the 30-day window is computed per doctor |
| DOC-5 | Doctors and patients can edit their own profiles; email change requires re-verification | P1 | Users can edit only their own profile |
| DOC-6 | Avatars are initials-based and generated on the client, with no photo upload | P1 | Same user always gets the same color |

### 7.3 Availability & Slots

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| SCH-1 | Doctor defines a weekly template of working hours per weekday | P0 | Overlapping ranges on one day are rejected |
| SCH-2 | Doctor adds date overrides: day off, different hours, or extra session | P0 | An override for a date replaces the template for that date |
| SCH-3 | Every slot is 20 minutes: 15 minutes consultation plus 5 minutes buffer. Slots are computed from override-or-template minus booked slots | P0 | A 9:00 to 13:00 session yields 12 slots; partial trailing slots are dropped |
| SCH-4 | Booking window: from the minimum lead time up to 30 days ahead | P0 | Past slots and slots beyond the window are not offered or bookable |
| SCH-5 | On saving a schedule change or leave, doctor sees how many booked appointments are affected before confirming | P0 | Count matches the flagged set exactly |
| SCH-6 | Affected appointments are flagged `needs_reschedule` in a single transaction and patients are emailed | P0 | No appointment is silently deleted or left in an invalid slot |

### 7.4 Appointments

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| APT-1 | Book an appointment for a doctor and slot. Patients book for themselves; receptionists book for any patient | P0 | Ownership enforced server-side |
| APT-2 | No double-booking: database exclusion constraint on (doctor, time range) for non-cancelled appointments | P0 | 10 simultaneous requests for one slot yield 1 success and 9 conflicts (409 `SLOT_TAKEN`) |
| APT-3 | No overlapping appointments for one patient (second exclusion constraint) | P0 | Returns 409 `PATIENT_OVERLAP` |
| APT-4 | Slot is revalidated server-side at submit time | P0 | A stale page cannot book an unavailable slot |
| APT-5 | Status lifecycle enforced by one state-machine function; doctors can update only their own appointments (complete, no-show, or cancel to the reschedule queue) | P0 | Invalid transitions are rejected; see rules in 7.9 |
| APT-6 | Patients and receptionists can cancel any time before start; reason required for receptionists, optional for patients. Doctors cancel only their own appointments, with a required reason, and the appointment goes to the receptionist's reschedule queue (see APT-8) | P0 | Cancelled slot is immediately bookable again |
| APT-7 | Reschedule is atomic: the new slot is booked and the old one released in one transaction | P0 | If the new slot is taken, the original appointment is unchanged |
| APT-8 | Receptionist Needs rescheduling queue with suggested next slots; it receives appointments flagged by doctor schedule changes and appointments cancelled by doctors. Only receptionists reschedule | P0 | Concurrent handling by two receptionists: one succeeds, the other sees already handled |
| APT-9 | Doctor or receptionist can mark no-show only after the slot ends | P0 | Earlier attempt is rejected |
| APT-10 | Completing an appointment requires a finalized visit record | P0 | Complete without a record is rejected |
| APT-11 | Follow-up booking from a visit record with a `follow_up_of` link | P1 | Pre-fills the same doctor; falls back to nearest available slots |
| APT-12 | Each appointment stores `booked_by` for accountability | P1 | Value is visible in the audit log |

### 7.5 Medical Records

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| REC-1 | Patient profile with blood group, allergies, chronic conditions, emergency contact | P0 | Medical fields editable by treating doctors only |
| REC-2 | One visit record per completed appointment: complaint, diagnosis, notes | P0 | Linked to the appointment, doctor, and patient |
| REC-3 | Vitals: BP, pulse, temperature, weight, height, SpO2 | P0 | Impossible values rejected; unusual values warned |
| REC-4 | Doctor can view a patient's full medical history (profile, past visits, vitals, prescriptions) anytime without appointment time restrictions | P0 | Verified doctors can view full medical history for any patient at any time for clinical review and continuity of care; every view is recorded in the audit log |
| REC-5 | Patients can view all of their own records and prescriptions, read-only | P0 | Cannot view anyone else's |
| REC-6 | Receptionists and admins have no access to clinical data | P0 | Endpoints return 403 |
| REC-7 | Finalized records change only through amendments with a trail | P2 | Original content is never overwritten |
| REC-8 | A draft visit record stays editable by the attending doctor until finalized. Doctors retain full read access to the patient's medical history anytime | P0 | A draft stays editable until finalized; history endpoints are accessible anytime to doctors |

### 7.6 Prescriptions

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| RX-1 | Prescription tied to a visit, with items as free text: medicine name, dosage, frequency, duration, instructions | P0 | Items stored in a normalized table; length limits applied |
| RX-2 | Downloadable PDF with hospital name, doctor, patient, date, and prescription ID | P0 | Authorized users only |
| RX-3 | Prescription is emailed to the patient with the PDF attached | P1 | Email contains no diagnosis |
| RX-4 | Soft allergy warning on string match with recorded allergies | P1 | Warning only; the doctor can proceed |
| RX-5 | Corrected prescriptions are versioned and the old one marked superseded | P2 | Old PDF remains retrievable |
| RX-6 | Suggest from the doctor's own past medicine names | P2 | Autocomplete uses only that doctor's history |

### 7.7 Notifications

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| NOT-1 | Email outbox table (recipient, template, payload, status, attempts, send_after) | P0 | Requests never block on SMTP; rows are written in the same transaction as the triggering action |
| NOT-2 | Worker sends with Nodemailer, retries with backoff, marks failed after N attempts | P0 | Failures are visible to the admin |
| NOT-3 | Booking confirmation, cancellation and reschedule notices, and the `needs_reschedule` flag notice | P0 | Sent on each trigger |
| NOT-4 | 24-hour reminder via node-cron every 15 minutes | P0 | `reminder_sent_at` prevents duplicates; reset on reschedule; skipped for appointments booked inside 24 hours or already started |
| NOT-5 | Row locking (`FOR UPDATE SKIP LOCKED`) so overlapping runs never double-send | P0 | Verified by a test running two workers |
| NOT-6 | Status is re-checked at send time | P0 | Cancelled appointments never get reminders |
| NOT-7 | Activation, invite, and password reset emails | P0 | Links are single-use and expire |
| NOT-8 | Emails contain no clinical details | P0 | Template review |

### 7.8 Admin Dashboard & Audit

| ID | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
| ADM-1 | Summary cards: appointments today, upcoming this week, total patients, active doctors, pending reschedules | P1 | Values match the database |
| ADM-2 | Charts: appointments over time (7, 30, 90 days), by department, by status | P1 | Shared date-range filter; SQL aggregations with indexes |
| ADM-3 | Audit log records record views, edits, status changes, and reschedules (user, action, target, old and new values, timestamp) | P1 | Every clinical record view creates an entry |
| ADM-4 | Audit log viewer with filters by user, action, and date | P2 | Paginated |

### 7.9 Business Rules

1. **Status flow.** `booked` → `completed`, `cancelled`, `no_show`, or `needs_reschedule`. `needs_reschedule` → `booked` (rescheduled) or `cancelled`. `completed`, `cancelled`, and `no_show` are terminal. A separate `confirmed` status is not used.
2. A `needs_reschedule` appointment keeps holding its original slot until resolved.
3. Doctors can view a patient's medical history at any time for clinical reference and continuity of care. Editing/recording vitals and visit notes for an appointment is limited to the attending doctor.
4. Cancellation is allowed only before the start time; after the slot has started, only completed or no_show applies. When a doctor cancels their own appointment, it moves to `needs_reschedule` with a required reason; the receptionist then reschedules it or cancels it for good.
5. No hard deletes of clinical or appointment data; use soft deletion or deactivation.
6. A doctor changing department keeps past appointments as they were.
7. Doctors cannot be patients: one account, one role, and a doctor needing care uses a different email.
8. All times are stored as `timestamptz` and displayed in the hospital's single configured timezone.
9. Transition updates are conditional (for example, `WHERE status = expected`), so only one of two concurrent actions wins.

### 7.10 Role Permission Matrix

| Capability | Admin | Doctor | Receptionist | Patient |
|---|---|---|---|---|
| Manage users and departments | Yes | No | No | No |
| Manage own availability | No | Yes | No | No |
| Book appointments | No | No | For any patient | For self |
| Cancel appointments | No | Own appointments (goes to reschedule queue) | Any, before start | Own, before start |
| Resolve `needs_reschedule` queue | No | No | Yes | No |
| View demographics and contact details | Yes | Own patients | Yes | Own |
| View or edit clinical records | No | Own appointments only, from 20 minutes before start until slot end | No | Own, read-only |
| Write prescriptions | No | Yes | No | No |
| View dashboard analytics | Yes | No | No | No |
| View audit log | Yes | No | No | No |

### 7.11 Non-Functional Requirements

- **Security:** bcrypt password hashing; parameterized SQL only; Zod validation on every endpoint; Helmet and CORS; rate limiting; ownership checks on every resource ID; output escaping for user-written text; no sensitive data in logs.
- **Reliability:** migrations are reversible; seed script is idempotent; consistent error response shape (code, message, field errors); Postgres error codes mapped to friendly errors (23P01 slot taken, 23505 duplicate, 23503 invalid reference).
- **Performance:** indexes on appointment start_time, status, doctor_id, and patient_id; p95 under 300 ms on seed data.
- **Usability:** responsive layout; clear empty, loading, and error states; role-specific navigation.
- **Maintainability:** layered code (routes, controllers, services, db queries); plain JavaScript (ES modules) with ESLint and Prettier; Zod validation on every API input.
- **Testing:** Vitest and Supertest against a separate test database; race, RBAC and ownership, state machine, slot generation, and reminder idempotency tests are mandatory.

---

## 8. Out of Scope (Non-Goals)

- Billing, payments, and insurance
- Pharmacy, medicine catalog, and drug-interaction checking
- Lab reports and any file or photo uploads (avatars are generated)
- Video consultations and in-app chat
- Bed, ward, and admission management
- Multi-hospital or multi-branch support
- Multiple roles per account and a role switcher
- Minors and guardian accounts; shared-contact family accounts
- Cancellation penalties and booking blocks for no-shows
- Slot holds while filling the form
- Doctor daily summary emails, SMS or push notifications, and in-app notification bell
- CSV and report exports
- Regulatory certification (HIPAA or local equivalents); this is an academic system and not for real patient data

---

## 9. Assumptions, Dependencies & Constraints

### Assumptions

- The system serves a single hospital in one timezone.
- Users have a working email address (phone-only walk-ins have no login and no emails).
- Patients may be minors only in the sense that the system does not model them specially.
- Minimum booking lead time is 1 hour and the booking window is 30 days (adjustable config values).
- The allergy check is a simple string match and is not clinically reliable.

### Dependencies

- PostgreSQL with the `btree_gist` extension available (supported by Neon and Supabase)
- An SMTP service: Ethereal or Mailtrap in development; Gmail SMTP or a free provider for the demo
- Hosting free tiers (Render or Railway for the API, Neon or Supabase for Postgres, Vercel or Netlify for the client)

### Constraints

- One developer, about 8 weeks, so P0 scope is protected first
- Free-tier infrastructure limits (cold starts, email quotas)

### Technical approach

- Two separate folders, `backend` and `frontend`, with no shared package; Zod validation lives in the backend, and role, status, and slot constants are defined once in the backend and mirrored in the frontend
- Backend layers: routes, controllers, services, and db queries (one file per domain, with all SQL in this layer); raw SQL via node-pg with a `withTransaction` helper; node-pg-migrate with reversible migrations
- Frontend: React with Vite, React Router, TanStack Query, React Hook Form with Zod, Tailwind, Recharts
- Background: node-cron for reminders and the outbox worker; PDFKit for prescriptions; pino for logs
- Core tables: `users`, `patients`, `departments`, `doctors`, `weekly_availability`, `availability_overrides`, `appointments`, `visit_records`, `vitals`, `prescriptions`, `prescription_items`, `email_outbox`, `audit_logs`, `refresh_tokens`

### Suggested timeline

| Weeks | Focus |
|---|---|
| 1–2 | ER design, migrations, auth and RBAC, invites |
| 3–4 | Departments, doctors, availability, slot generation, booking engine and race test |
| 5–6 | Reschedule queue, visit records, vitals, prescriptions and PDF, email outbox and reminders |
| 7 | P1 items: search, follow-ups, profiles, admin dashboard, audit log |
| 8 | Security hardening, test coverage, seed data, report, and demo rehearsal |

---

## 10. Designs & Assets

No designs exist yet. Planned deliverables:

| Asset | Link / status |
|---|---|
| ER diagram of the database | To be created in week 1 |
| Low-fidelity wireframes: patient booking flow, doctor schedule manager, receptionist board and reschedule queue, visit and prescription form, admin dashboard | To be created (Figma link: [TBD]) |
| Booking state machine diagram | To be created |
| API route list | To be generated from the code |
| Seeded demo accounts (one per role) and demo script | To be created in week 8 |

---

## 11. Open Questions & Decision Log

### Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| 1 | Minimum booking lead time: 1 hour, or different? | Developer | Week 3 |
| 2 | Should doctors see other doctors' visit notes for a shared patient, or only their own? Currently: full history for treating doctors | Developer and supervisor | Week 5 |
| 3 | Can a doctor's department change affect past appointment reports, or is current department acceptable for charts? | Developer | Week 7 |
| 4 | Can one real clinic receptionist be interviewed to validate the workflow? | Developer | Week 2 |
| 5 | Which hosting providers will be used for the final demo, and is the evaluators' setup online or local? | Developer | Week 7 |
| 6 | Does the supervisor expect any specific academic deliverables (report format, UML diagrams) beyond this PRD? | Developer | Week 1 |
| 7 | After the window closes, how long may a doctor still finalize notes and the prescription? Current default: until finalized, with no history access | Developer | Week 5 |

### Decision log

| # | Decision | Rationale |
|---|---|---|
| D1 | Stack is PERN with plain JavaScript on both sides (changed from TypeScript, see D23) | Relational data suits Postgres |
| D2 | Raw SQL with node-pg and node-pg-migrate instead of an ORM | Full control of constraints and transactions; easier to explain in a viva |
| D3 | Patients can self-register or be created by receptionists | Realistic for walk-ins and online users |
| D4 | Walk-in patients can claim accounts later via an invite link | Preserves history without forcing a login |
| D5 | Slots are 20 minutes: 15 consultation plus 5 buffer | Stakeholder requirement |
| D6 | Doctors set a weekly template plus date overrides | Flexibility without complex recurring rules |
| D7 | Schedule changes with existing bookings are allowed and flagged for receptionist rescheduling | Avoids silent cancellations; creates a clear workflow |
| D8 | Double-booking is prevented by a Postgres exclusion constraint | Correct under concurrency and across multiple server instances |
| D9 | Medical scope: profile, visit notes, vitals, prescriptions | Rich enough without file uploads |
| D10 | Doctors see records only of patients they have an appointment with (time-boxed by D22) | Least privilege; simple to enforce and test |
| D11 | Receptionists and admins have no clinical access | Least privilege |
| D12 | Cancellation: anyone allowed may cancel any time before start; no penalties | Keeps the state machine and UI small |
| D13 | Prescriptions use free-text medicine entry | Avoids building a medicine catalog |
| D14 | Emails: confirmation, 24-hour reminder, cancel and reschedule notices, prescription with PDF; plus activation and password reset as required system emails | Activation is needed by the walk-in claim flow |
| D15 | Admin analytics: cards plus three charts | Good demo value at low cost |
| D16 | Extras in scope: profile editing, doctor search with next available slot, follow-up booking | Chosen by the owner for demo value |
| D17 | No photo uploads; initials avatars | Removes upload security and storage work |
| D18 | One account equals one role; emails unique across all users | Simplest and safest access model |
| D19 | A separate `confirmed` status is dropped from the lifecycle | Added no value once cancellation rules were simplified |
| D20 | Email delivery uses an outbox with retries, and reminders are idempotent | Reliability and testability |
| D21 | Doctors can cancel their own appointments with a reason and update their status; the cancelled appointment goes to the receptionist queue, and only receptionists reschedule | Doctors know when they cannot attend; keeping rescheduling with receptionists reuses the existing `needs_reschedule` flow |
| D22 | Doctors can read patient medical records anytime without time window restrictions | Enables doctors to review patient history, prepare for consultations, and review past visits anytime |
| D23 | Use plain JavaScript (ES modules) instead of TypeScript, with separate backend and frontend folders instead of a monorepo with a shared package | Faster start and simpler tooling for a solo 8-week build; Zod runtime validation and the test suite carry the correctness work, and TypeScript would not catch mistakes inside SQL strings anyway |
