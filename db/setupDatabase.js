const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const saltRounds = 10;

const rawData = fs.readFileSync(path.join(__dirname, 'db.json'));
const mockData = JSON.parse(rawData);
const dbPath = path.join('/tmp', 'database.sqlite');

async function setupDatabase(callback) {
  const db = new sqlite3.Database(dbPath);

  try {
    db.serialize(async () => {
      try {
        await runQuery(db, `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT,
          password TEXT,
          name TEXT,
          surname TEXT,
          role TEXT,
          specialization TEXT,
          pesel TEXT,
          phone TEXT,
          dateOfBirth TEXT,
          doctorId TEXT
        )`);

        await runQuery(db, `CREATE TABLE IF NOT EXISTS questions (
          id TEXT PRIMARY KEY,
          content TEXT
        )`);

        await runQuery(db, `CREATE TABLE IF NOT EXISTS answers (
          id TEXT PRIMARY KEY,
          date TEXT,
          patientId TEXT,
          doctorId TEXT,
          score INTEGER
        )`);

        await runQuery(db, `CREATE TABLE IF NOT EXISTS answer_details (
          id TEXT PRIMARY KEY,
          answerId TEXT,
          questionId TEXT,
          answer INTEGER,
          FOREIGN KEY(answerId) REFERENCES answers(id),
          FOREIGN KEY(questionId) REFERENCES questions(id)
        )`);

        const userCount = await getCount(db, 'users');
        if (userCount === 0) {
          const insertUserStmt = db.prepare(`
            INSERT INTO users (id, email, password, name, surname, role, specialization, pesel, phone, dateOfBirth, doctorId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
    
          for (const user of mockData.users) {
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            insertUserStmt.run(
              user.id,
              user.email,
              hashedPassword,
              user.name,
              user.surname,
              user.role,
              user.specialization,
              user.pesel,
              user.phone,
              user.dateOfBirth,
              user.doctorId
            );
          }
          insertUserStmt.finalize();
        }

        const questionCount = await getCount(db, 'questions');
        if (questionCount === 0) {
          const insertQuestionStmt = db.prepare(`
            INSERT INTO questions (id, content)
            VALUES (?, ?)
          `);
          mockData.questions.forEach(question => {
            insertQuestionStmt.run(
              question.id,
              question.content
            );
          });
          insertQuestionStmt.finalize();
        }

        const answerCount = await getCount(db, 'answers');
        if (answerCount === 0) {
          const insertAnswerStmt = db.prepare(`
            INSERT INTO answers (id, date, patientId, doctorId, score)
            VALUES (?, ?, ?, ?, ?)
          `);

          const insertAnswerDetailStmt = db.prepare(`
            INSERT INTO answer_details (id, answerId, questionId, answer)
            VALUES (?, ?, ?, ?)
          `);

          mockData.answers.forEach(answer => {
            insertAnswerStmt.run(
              answer.id,
              answer.date,
              answer.patientId,
              answer.doctorId,
              answer.score
            );

            answer.answers.forEach(detail => {
              const detailId = uuidv4();
              insertAnswerDetailStmt.run(
                detailId,
                answer.id,
                detail.id,
                detail.answer
              );
            });
          });

          insertAnswerStmt.finalize();
          insertAnswerDetailStmt.finalize();
        }

        db.close(err => {
          if (err) {
            console.error('Error closing the database:', err);
            return;
          }
          console.log('Database setup complete.');
          if (callback) callback();
        });

      } catch (err) {
        console.error('Error during database setup:', err);
        if (callback) callback(err);
      }
    });
  } catch (err) {
    console.error('Error during database setup:', err);
    if (callback) callback(err);
  }
}

function runQuery(db, query) {
  return new Promise((resolve, reject) => {
    db.run(query, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getCount(db, tableName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) AS count FROM ${tableName}`, (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

module.exports = setupDatabase;