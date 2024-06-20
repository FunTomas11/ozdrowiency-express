const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, '../db/database.sqlite'));
var express = require('express');
var router = express.Router();
const { randomUUID } = require('crypto');
const { login } = require('../db/models/user');

router.get('/', (req, res) => {
  const { doctorId, role } = req.query;

  let sql = 'SELECT * FROM users';
  const params = [];

  if (doctorId && role) {
    sql += ' WHERE doctorId = ? AND role = ?';
    params.push(doctorId, role);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  const userId = req.params.id;

  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(row);
  });
});

/**
* Endpoint POST /login - Loguje użytkownika.
*
*
* @param {Object} req - Obiekt żądania HTTP.
* @param {Object} res - Obiekt odpowiedzi HTTP.
*/
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const sessionId = req.body.sessionId || randomUUID();

  try {
      const user = await login(email, password);
      res.json({ message: 'Login successful', user, sessionId });
  } catch (err) {
      console.error(err);
      res.status(401).json({ error: err.message });
  }
});

module.exports = router;
