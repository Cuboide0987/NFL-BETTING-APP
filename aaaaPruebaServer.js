const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
app.use(bodyParser.json());

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@HOLAHOLA1',
    database: 'aaaapruebadeservidor'
});
///////////////
const path = require('path');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database.');
});

// Ruta para añadir usuarios
app.post('/add-user', (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ message: 'Username and email are required.' });
    }

    const query = 'INSERT INTO users (username, email) VALUES (?, ?)';
    db.query(query, [username, email], (err) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).json({ message: 'Failed to add user.' });
        }
        res.status(200).json({ message: 'User added successfully!' });
    });
});

// Servir el archivo HTML
app.use(express.static('public'));

// Iniciar el servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
