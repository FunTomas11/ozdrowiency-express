const db = require('../db');
const bcrypt = require('bcrypt');

async function login(username, password) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [username], async (err, user) => {
            if (err) {
                reject(err); 
            } else if (!user) {
                reject(new Error('Invalid username or password'));
            } else {
                const isMatch = await bcrypt.compare(password, user.password);
                if (isMatch) {
                    resolve(user);
                } else {
                    reject(new Error('Invalid username or password'));
                }
            }
        });
    });
}

module.exports = { login };