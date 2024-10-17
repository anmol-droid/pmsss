const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/Anmol/Desktop/data.db');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// A hypothetical function to map espId to the corresponding date in MMDDYYYY format
const getTableForEspId = (espId) => {
  // Implement your logic here. This is just a static mapping for demonstration.
  const espToDateMap = {
    'machine1': '10172024', // Example mapping
    'machine2': '10162024', // Add more as necessary
  };

  return espToDateMap[espId] || null; // Return null if espId not found
};

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Query the database to check for the user
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  db.get(query, [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Error querying the database' });
    }

    if (row) {
      // User found
      return res.status(200).json({ message: 'Login successful' });
    } else {
      // User not found
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  });
});

// New endpoint to fetch digital counts and machine status
app.get('/api/digital-count', async (req, res) => {
  try {
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sensor_data_%'", [], (err, tables) => {
        if (err) {
          return reject(new Error('Error retrieving table names'));
        }
        resolve(tables);
      });
    });

    const espData = {};
    const countPromises = tables.map(table => {
      return new Promise((resolve, reject) => {
        db.all(`
          SELECT esp_id, COUNT(digital) AS digital_count, 
                 MAX(machine_status) AS machine_status 
          FROM ${table.name} 
          WHERE digital = 1 
          GROUP BY esp_id
        `, [], (err, rows) => {
          if (err) {
            console.error(`Error retrieving data from table ${table.name}:`, err);
            return reject(err);
          }

          rows.forEach(row => {
            if (!espData[row.esp_id]) {
              espData[row.esp_id] = { digital_count: 0, machine_status: null };
            }
            espData[row.esp_id].digital_count += row.digital_count;
            espData[row.esp_id].machine_status = row.machine_status;
          });

          resolve();
        });
      });
    });

    await Promise.all(countPromises);
    
    const responseData = Object.entries(espData).map(([esp_id, data]) => ({
      esp_id,
      digital_count: data.digital_count,
      machine_status: data.machine_status,
    }));

    return res.json(responseData);
  } catch (err) {
    console.error('Error retrieving digital counts and statuses:', err);
    return res.status(500).json({ message: 'Error retrieving digital counts and statuses' });
  }
});

// New endpoint to fetch specific machine data by esp_id
// New endpoint to fetch specific machine data by esp_id and date range
// New endpoint to fetch specific machine data by esp_id and date range
app.get('/api/machine/:espId', async (req, res) => {
  const espId = req.params.espId;
  const { fromDate, toDate } = req.query;

  if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'Both fromDate and toDate are required' });
  }

  const startDate = fromDate.replace(/(\d{2})(\d{2})(\d{4})/, '$1$2$3');
  const endDate = toDate.replace(/(\d{2})(\d{2})(\d{4})/, '$1$2$3');

  console.log('Start Date:', startDate);
  console.log('End Date:', endDate);

  const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sensor_data_%'", [], (err, tables) => {
          if (err) {
              return reject(new Error('Error retrieving table names'));
          }
          resolve(tables);
      });
  });

  console.log('Tables:', tables);

  const countPromises = tables.map(table => {
      return new Promise((resolve, reject) => {
          const dateFromTable = table.name.split('_')[2]; // Extract date part

          if (dateFromTable >= startDate && dateFromTable <= endDate) {
              db.all(`SELECT COUNT(digital) AS digital_count 
                      FROM ${table.name} 
                      WHERE esp_id = ? AND digital = 1`, [espId], (err, rows) => {
                  if (err) {
                      console.error(`Error retrieving data from table ${table.name}:`, err);
                      return reject(err);
                  }

                  console.log(`Rows from ${table.name}:`, rows); // Log the returned rows
                  resolve(rows.reduce((total, row) => total + (row.digital_count || 0), 0));
              });
          } else {
              resolve(0);
          }
      });
  });

  try {
      const results = await Promise.all(countPromises);
      const totalDigitalCount = results.reduce((total, count) => total + count, 0);
      
      return res.json({ totalDigitalCount });
  } catch (err) {
      console.error('Error retrieving machine data:', err);
      return res.status(500).json({ message: 'Error retrieving machine data' });
  }
});



// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
