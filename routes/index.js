const { send } = require('../public/javascripts/notification')

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

router.get('/send', function (req, res, next) {
  send();
  res.send(200);
})

module.exports = router;
