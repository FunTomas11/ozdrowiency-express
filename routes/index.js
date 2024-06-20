const { send } = require('../public/javascripts/notification')

var express = require('express');
var router = express.Router();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, '../db/database.sqlite'));

router.get('/questions', (req, res) => {
  db.all('SELECT * FROM questions', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

router.get('/answers', (req, res) => {
  const sql = `
    SELECT a.id AS answerId, a.date, a.patientId, a.doctorId, a.score, 
           ad.id AS detailId, ad.questionId, q.content, ad.answer
    FROM answers a
    JOIN answer_details ad ON a.id = ad.answerId
    JOIN questions q ON ad.questionId = q.id
  `;
  db.all(sql, [], (err, rows) => {
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

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/send', function (req, res, next) {
  send();
  res.send(200);
})

module.exports = router;
