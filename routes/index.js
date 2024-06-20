const { sendResults, sendReminder, sendQualified } = require('../public/javascripts/notification')

var express = require('express');
var router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, '../db/database.sqlite'));

router.get('/users', (req, res) => {
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

router.get('/users/:id', (req, res) => {
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

router.get('/questions', (req, res) => {
  const page = parseInt(req.query._page) || 1;
  const perPage = parseInt(req.query._per_page) || 5;
  const offset = (page - 1) * perPage;

  db.all('SELECT * FROM questions LIMIT ? OFFSET ?', [perPage, offset], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.get('SELECT COUNT(*) AS count FROM questions', [], (err, countRow) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        data: rows,
        total: countRow.count,
        page,
        perPage,
      });
    });
  });
});

router.get('/answers', (req, res) => {
  const { doctorId, patientId } = req.query;

  let sql = `
    SELECT a.id AS answerId, a.date, a.patientId, a.doctorId, a.score, 
           ad.id AS detailId, ad.questionId, q.content, ad.answer
    FROM answers a
    JOIN answer_details ad ON a.id = ad.answerId
    JOIN questions q ON ad.questionId = q.id
  `;
  const params = [];

  if (doctorId) {
    sql += ' WHERE a.doctorId = ?';
    params.push(doctorId);
  } else if (patientId) {
    sql += ' WHERE a.patientId = ?';
    params.push(patientId);
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const answers = rows.reduce((acc, row) => {
      const { answerId, date, patientId, doctorId, score, detailId, questionId, content, answer } = row;
      if (!acc[answerId]) {
        acc[answerId] = {
          id: answerId,
          date,
          patientId,
          doctorId,
          score,
          answers: []
        };
      }
      acc[answerId].answers.push({ id: detailId, questionId, content, answer });
      return acc;
    }, {});

    res.json(Object.values(answers));
  });
});

router.get('/answers/:id', (req, res) => {
  const answerId = req.params.id;
  const sql = `
    SELECT a.id AS answerId, a.date, a.patientId, a.doctorId, a.score, 
           ad.id AS detailId, ad.questionId, q.content, ad.answer
    FROM answers a
    JOIN answer_details ad ON a.id = ad.answerId
    JOIN questions q ON ad.questionId = q.id
    WHERE a.id = ?
  `;
  db.all(sql, [answerId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    const answer = {
      id: rows[0].answerId,
      date: rows[0].date,
      patientId: rows[0].patientId,
      doctorId: rows[0].doctorId,
      score: rows[0].score,
      answers: rows.map(row => ({
        id: row.detailId,
        questionId: row.questionId,
        content: row.content,
        answer: row.answer
      }))
    };

    res.json(answer);
  });
});

router.post('/answers', (req, res) => {
  const { id, date, patientId, doctorId, score, answers } = req.body;
  const answerId = id || uuidv4();

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    const insertAnswerStmt = db.prepare(`
      INSERT INTO answers (id, date, patientId, doctorId, score)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertAnswerDetailStmt = db.prepare(`
      INSERT INTO answer_details (id, answerId, questionId, answer)
      VALUES (?, ?, ?, ?)
    `);

    try {
      insertAnswerStmt.run(
        answerId,
        date,
        patientId,
        doctorId,
        score
      );

      answers.forEach(detail => {
        const detailId = uuidv4();
        insertAnswerDetailStmt.run(
          detailId,
          answerId,
          detail.questionId,
          detail.answer
        );
      });

      db.run('COMMIT', (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Answer saved successfully', id: answerId });
      });
    } catch (err) {
      db.run('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      insertAnswerStmt.finalize();
      insertAnswerDetailStmt.finalize();
    }
  });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/sendResults', function (req, res, next) {
  try {
    const answerItem = req.body;
    const patientId = answerItem.patientId;

    // Fetch patient details from the database directly
    getPatientById(patientId, res, (patient) => {
      const patientName = patient.name;
      const patientEmail = patient.email;
      const isQualified = answerItem.score >= 50;

      // Call sendResults function with patient's details
      sendResults(patientEmail, patientName, isQualified);

      res.status(200).send('Results email sent successfully');
    });
  } catch (error) {
    console.error('Error sending results:', error);
    res.status(500).send('Internal Server Error');
  }
})

router.post('/sendReminder', function (req, res, next) {
  try {
    const answerItem = req.body;
    const patientId = answerItem.patientId;

    // Fetch patient details from the database directly
    getPatientById(patientId, res, (patient) => {
      const patientName = patient.name;
      const patientEmail = patient.email;

      // Call sendResults function with patient's details
      sendReminder(patientEmail, patientName);

      res.status(200).send('Results email sent successfully');
    });
  } catch (error) {
    console.error('Error sending results:', error);
    res.status(500).send('Internal Server Error');
  }
})

router.post('/sendQualified', function (req, res, next) {
  try {
    const answerItem = req.body;
    const patientId = answerItem.patientId;

    // Fetch patient details from the database directly
    getPatientById(patientId, res, (patient) => {
      const patientName = patient.name;
      const patientEmail = patient.email;
      const patientPhone = patient.phone;

      // Call sendResults function with patient's details
      sendQualified(patientEmail, patientName, patientPhone);

      res.status(200).send('Results email sent successfully');
    });
  } catch (error) {
    console.error('Error sending results:', error);
    res.status(500).send('Internal Server Error');
  }
})

function getPatientById(patientId, res, callback) {
  db.get('SELECT * FROM users WHERE id = ?', [patientId], (err, patient) => {
    if (err) {
      console.error('Error fetching patient:', err.message);
      return res.status(500).send('Internal Server Error');
    }

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    callback(patient);
  });
}

module.exports = router;
