import cron from 'node-cron';
import { pool } from '../db/pool.js';
import * as appointmentsQueries from '../db/queries/appointments.queries.js';

export function startReminderJob() {
  console.log('⏰ [Reminder Job] Initialized (scheduled for every 15 minutes)');

  const task = cron.schedule('*/15 * * * *', async () => {
    try {
      const candidates = await appointmentsQueries.findUpcomingAppointmentsNeedingReminder(pool);

      if (candidates.length > 0) {
        console.log(`🔔 [Reminder Job] Found ${candidates.length} appointment(s) needing 24h reminders.`);
        for (const appt of candidates) {
          console.log(
            `📨 [Simulated Reminder] To: ${appt.patient_email} | Hi ${appt.patient_first_name}, you have an appointment with Dr. ${appt.doctor_first_name} tomorrow at ${new Date(appt.start_time).toLocaleTimeString()}`
          );
          await appointmentsQueries.markReminderSent(pool, appt.id);
        }
      }
    } catch (err) {
      console.error('❌ [Reminder Job Error]:', err.message);
    }
  });

  return task;
}