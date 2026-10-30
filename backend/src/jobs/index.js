import { startReminderJob } from './reminder.job.js';

let reminderTask = null;

export function initBackgroundJobs() {
  reminderTask = startReminderJob();
}

export function stopBackgroundJobs() {
  if (reminderTask) {
    reminderTask.stop();
    console.log('⏰ [Reminder Job] Stopped cleanly.');
  }
}