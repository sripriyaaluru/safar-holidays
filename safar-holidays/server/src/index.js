// Entry point: loads sample data on first run, then starts the API server.
import { config } from './config.js';
import db from './db.js';
import { createApp } from './app.js';
import { seedDatabase } from './seed.js';

const { n } = db.prepare('SELECT COUNT(*) AS n FROM packages').get();
if (n === 0) {
  seedDatabase(db);
  console.log('Empty database detected, so sample packages and demo accounts were added.');
}

createApp().listen(config.port, () => {
  console.log(`Safar Holidays API is running at http://localhost:${config.port}`);
});
