const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { sendReminder } = require('./notification');
const dbPath = path.join('/tmp', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function findPatientsAndSendReminders() {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const formattedDate = twoWeeksAgo.toISOString().split('T')[0];

  const sql = `
    SELECT u.id, u.email, u.name
    FROM users u
    LEFT JOIN answers a ON u.id = a.patientId
    WHERE (a.date IS NULL OR a.date < ?) AND u.role = 'patient'
    GROUP BY u.id
  `;

  db.all(sql, [formattedDate], (err, rows) => {
    if (err) {
      return console.error('Error querying patients:', err.message);
    }

    rows.forEach((patient) => {
      sendReminder(patient.email, patient.name);
    });
  });
}

findPatientsAndSendReminders();

module.exports = findPatientsAndSendReminders;