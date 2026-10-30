import app from './app.js';
import { env } from './config/env.js';
import { initBackgroundJobs, stopBackgroundJobs } from './jobs/index.js';
import { pool } from './db/pool.js';

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
  initBackgroundJobs();
});

async function shutdown() {
  stopBackgroundJobs();

  server.close(async () => {
    try {
      await pool.end();
      console.log('Server and database closed.');
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);