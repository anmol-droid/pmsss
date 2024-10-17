const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to the SQLite database file (do NOT use require for this)
const dbPath = path.resolve('C:/Users/Anmol/Desktop/data.db');

// Connect to the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

module.exports = db;
