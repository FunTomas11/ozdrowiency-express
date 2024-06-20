var express = require('express');
var router = express.Router();
const { randomUUID } = require('crypto');
const { login } = require('../db/models/user');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
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
