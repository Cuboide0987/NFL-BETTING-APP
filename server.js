require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const fetch = require('node-fetch');
const cron = require('node-cron');
const app = express();
const cors = require('cors');
const { format } = require('date-fns'); // Import date-fns for date formatting

const API_KEY = process.env.API_KEY;
const API_HOST = process.env.API_HOST;

// Configuración de middleware
app.use(cors({
    origin: ['http://127.0.0.1:3000', 'http://localhost:3000'], // Permitir estas URLs
    methods: ['GET', 'POST'], // Métodos permitidos
    credentials: true, // Permitir cookies si son necesarias
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

if (!API_KEY || !API_HOST) {
    console.error('Falta la configuración de API_KEY o API_HOST en el archivo .env');
    process.exit(1);
}
// Configuración de base de datos
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err);
        return;
    }
    console.log('Succesful connection to the database');
});

// Configuración del middleware de sesión
app.use(session({
    secret: 'mySuperSecretKey123!',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }

}));

// Función para verificar autenticación
function isAuthenticated(req, res, next) {
    console.log('Session data:', req.session);
    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
}

//lo del boton de +10 o -10
app.post('/update-balance', (req, res) => {
    const { action } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }

    const amount = action === 'increase' ? 10 : -10;
    const query = 'UPDATE users SET balance = balance + ? WHERE id = ?';

    db.query(query, [amount, userId], (err, results) => {
        if (err) {
            console.error('Error updating balance:', err);
            return res.status(500).json({ error: 'Failed to update balance' });
        }

        // Obtener el balance actualizado
        const fetchBalanceQuery = 'SELECT balance FROM users WHERE id = ?';
        db.query(fetchBalanceQuery, [userId], (err, results) => {
            if (err) {
                console.error('Error fetching updated balance:', err);
                return res.status(500).json({ error: 'Failed to fetch updated balance' });
            }

            const updatedBalance = results[0]?.balance;
            res.json({ balance: updatedBalance });
        });
    });
});






// Ruta para registro de usuarios
app.post('/register', async (req, res) => {
    const { username, password, balance = 0, role = 'user', devPassword } = req.body;

    // Validación del rol y clave de desarrollador
    if (role === 'developer' && devPassword !== process.env.DEV_KEY) {
        return res.status(400).json({ error: 'Invalid developer key' });
    }

    if (!['user', 'developer'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }

    // Verificar si el usuario ya existe
    const userExistsQuery = 'SELECT id FROM users WHERE username = ?';
    db.query(userExistsQuery, [username], async (err, results) => {
        if (err) {
            console.error('Error checking existing user:', err);
            return res.status(500).json({ error: 'Error checking existing user' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Username already in use' });
        }

        // Crear el usuario con hash de contraseña
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertUserQuery = `
                INSERT INTO users (username, password_hash, balance, role)
                VALUES (?, ?, ?, ?)
            `;
            db.query(insertUserQuery, [username, hashedPassword, balance, role], (err) => {
                if (err) {
                    console.error('Error registering user:', err);
                    return res.status(500).json({ error: 'Error registering user' });
                }
                res.status(200).json({ success: true, message: 'User registered successfully' });
            });
        } catch (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ error: 'Error registering user' });
        }
    });
});

// Ruta para inicio de sesión
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        if (results.length === 0 || !(await bcrypt.compare(password, results[0].password_hash))) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        req.session.user = {
            id: results[0].id,
            username: results[0].username,
            balance: results[0].balance,
            role: results[0].role,
        };

        res.json({ success: true, redirect: '/prueba.html' });
    });
});

// Ruta para cerrar sesión
app.post('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error('Error al cerrar sesión:', err);
                return res.status(500).json({ error: 'Error al cerrar sesión' });
            }
            res.clearCookie('connect.sid'); // Asegúrate de limpiar la cookie de sesión
            res.status(200).send('Sesión cerrada correctamente');
        });
    } else {
        res.status(400).json({ error: 'No hay sesión activa' });
    }
});



// Ruta para realizar una apuesta
app.post('/place-bet', isAuthenticated, (req, res) => {
    const { betAmount, selectedTeam, gameId } = req.body;

    if (!req.session.user) {
        return res.status(401).json({ error: 'User session not found.' });
    }

    const userId = req.session.user.id;

    if (betAmount < 10) {
        return res.status(400).json({ error: 'The minimum bet amount is $10.' });
    }

    // Continuar con la verificación de balance y la colocación de la apuesta
    db.query('SELECT balance FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching balance:', err);
            return res.status(500).json({ error: 'Failed to fetch balance.' });
        }

        const currentBalance = results[0]?.balance;

        if (currentBalance < betAmount) {
            return res.status(400).json({ error: 'Insufficient balance.' });
        }

        db.beginTransaction((err) => {
            if (err) {
                console.error('Transaction error:', err);
                return res.status(500).json({ error: 'Transaction error.' });
            }

            const updateBalanceQuery = 'UPDATE users SET balance = balance - ? WHERE id = ?';
            const insertBetQuery = 'INSERT INTO bets (user_id, amount, team_bet_on, game_id) VALUES (?, ?, ?, ?)';

            db.query(updateBalanceQuery, [betAmount, userId], (err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error updating balance:', err);
                        res.status(500).json({ error: 'Failed to update balance.' });
                    });
                }

                db.query(insertBetQuery, [userId, betAmount, selectedTeam, gameId], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error inserting bet:', err);
                            res.status(500).json({ error: 'Failed to place bet.' });
                        });
                    }

                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Error committing transaction:', err);
                                res.status(500).json({ error: 'Transaction commit error.' });
                            });
                        }
                        res.status(200).json({ success: true, message: 'Bet placed successfully.' });
                    });
                });
            });
        });
    });
});

//CLAIM THE MONEY AFTER YOU WIN
app.post('/claim-winnings', isAuthenticated, (req, res) => {
    const { betId } = req.body;
    const userId = req.session.user.id;

    if (!betId || !userId) {
        return res.status(400).json({ error: 'Missing betId or userId' });
    }

    const checkQuery = `SELECT amount, claimed, result FROM bets WHERE id = ? AND user_id = ?`;

    db.query(checkQuery, [betId, userId], (err, results) => {
        if (err) {
            console.error('Error fetching bet:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Bet not found.' });
        }

        const bet = results[0];

        if (bet.result !== 'Win') {
            return res.status(400).json({ error: 'You can only claim winnings from a winning bet.' });
        }

        if (bet.claimed === 'YES') {
            return res.status(400).json({ error: 'Winnings already claimed.' });
        }

        const winnings = bet.amount * 2; // 🏆 Duplica la cantidad apostada

        // Actualizar `claimed`, `winnings` y aumentar el balance del usuario
        const updateQuery = `UPDATE bets SET claimed = 'YES', winnings = ? WHERE id = ?`;
        const updateBalanceQuery = `UPDATE users SET balance = balance + ? WHERE id = ?`;

        db.beginTransaction((err) => {
            if (err) {
                console.error('Transaction error:', err);
                return res.status(500).json({ error: 'Transaction error.' });
            }

            db.query(updateQuery, [winnings, betId], (err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error updating bet:', err);
                        res.status(500).json({ error: 'Failed to update bet.' });
                    });
                }

                db.query(updateBalanceQuery, [winnings, userId], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error updating balance:', err);
                            res.status(500).json({ error: 'Failed to update balance.' });
                        });
                    }

                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Error committing transaction:', err);
                                res.status(500).json({ error: 'Transaction commit error.' });
                            });
                        }

                        // ✅ Enviar el nuevo balance actualizado al frontend
                        res.status(200).json({ success: true, message: 'Winnings claimed successfully!', winnings });
                    });
                });
            });
        });
    });
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server runing on PORT:  ${PORT}`);
});

app.get('/session-user', (req, res) => {
    if (req.session && req.session.user) {
        const userId = req.session.user.id;
        const query = 'SELECT username, balance FROM users WHERE id = ?';
        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Error fetching user data:', err);
                return res.status(500).json({ error: 'Failed to fetch user data.' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: 'User not found.' });
            }
            const user = results[0];
            req.session.user.balance = user.balance; // Actualiza el balance en la sesión
            res.json({ username: user.username, balance: user.balance });
        });
    } else {
        res.status(401).json({ error: 'Not authenticated.' });
    }
});


app.get('/get-bet-history', isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;

    const query = `
    SELECT 
        b.id AS bet_id, 
        b.game_id, 
        b.amount, 
        b.team_bet_on AS team, 
        b.created_at, 
        b.result, 
        b.claimed
    FROM bets b
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    `;


    try {
        db.query(query, [userId], async (err, results) => {
            if (err) {
                console.error('Error fetching bet history:', err);
                return res.status(500).json({ error: 'Error fetching bet history.' });
            }

            const detailedBets = await Promise.all(
                results.map(async (bet) => {
                    let gameDetails = {};
                    let result = bet.result || "Pending"; // Usa el resultado guardado en la BD si existe

                    try {
                        if (bet.game_id && result === "Pending") {
                            // Obtener detalles del juego desde la API en tiempo real
                            const gameResponse = await fetch(`https://${process.env.API_HOST}/nfl-single-events?id=${bet.game_id}`, {
                                method: 'GET',
                                headers: {
                                    'x-rapidapi-key': process.env.API_KEY,
                                    'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com',
                                },
                            });

                            if (gameResponse.ok) {
                                const gameData = await gameResponse.json();

                                const homeTeam = gameData?.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName || "Unknown Home Team";
                                const awayTeam = gameData?.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName || "Unknown Away Team";

                                // Buscar equipo ganador en el objeto `competitors`
                                const winningCompetitor = gameData?.competitions?.[0]?.competitors?.find(c => c.winner === true);
                                const winnerTeam = winningCompetitor ? winningCompetitor.team.displayName : "No Winner Yet";

                                const loserTeam = winnerTeam !== "No Winner Yet"
                                    ? (winnerTeam === homeTeam ? awayTeam : homeTeam)
                                    : "Unknown";

                                // Si ya tenemos un ganador, determinar si la apuesta ganó o perdió
                                if (winnerTeam !== "No Winner Yet") {
                                    result = (bet.team === winnerTeam) ? "Win" : "Lose";

                                    // Guardar el resultado en la base de datos para evitar que vuelva a "Pending"
                                    const updateQuery = `UPDATE bets SET result = ? WHERE id = ?`;
                                    db.query(updateQuery, [result, bet.bet_id], (updateErr) => {
                                        if (updateErr) {
                                            console.error(`Error updating bet result for bet ID ${bet.bet_id}:`, updateErr);
                                        } else {
                                            console.log(`Updated bet ${bet.bet_id} with result: ${result}`);
                                        }
                                    });
                                }

                                gameDetails = {
                                    gameName: `${homeTeam} vs ${awayTeam}`,
                                    gameId: bet.game_id,
                                    homeTeam,
                                    awayTeam,
                                    winnerTeam,
                                    loserTeam,
                                    result,
                                };
                            }
                        } else if (!bet.game_id) {
                            try {
                                // Si no hay game_id, buscar en el calendario del equipo
                                const teamId = teamMap[bet.team];

                                if (!teamId) {
                                    console.error(`No se encontró un ID para el equipo: ${bet.team}`);
                                    gameDetails = {
                                        gameName: "Unknown Match",
                                        gameId: "Not Found",
                                    };
                                } else {
                                    const scheduleResponse = await fetch(`https://${process.env.API_HOST}/team-schedule?id=${teamId}`, {
                                        method: "GET",
                                        headers: {
                                            "x-rapidapi-key": process.env.API_KEY,
                                            "x-rapidapi-host": process.env.API_HOST,
                                        },
                                    });

                                    if (!scheduleResponse.ok) {
                                        throw new Error(`API request failed with status: ${scheduleResponse.status}`);
                                    }

                                    const scheduleData = await scheduleResponse.json();

                                    // Buscar el partido que coincida con la fecha apostada
                                    const match = scheduleData.games.find(game => game.date.startsWith(bet.created_at.split('T')[0]));

                                    if (match) {
                                        const homeTeam = match.competitors.find(team => team.homeAway === "home")?.team.displayName || "Unknown Home Team";
                                        const awayTeam = match.competitors.find(team => team.homeAway === "away")?.team.displayName || "Unknown Away Team";
                                        const opposingTeam = homeTeam === bet.team ? awayTeam : homeTeam;

                                        gameDetails = {
                                            gameName: `${homeTeam} vs ${awayTeam}`,
                                            gameId: match.id,
                                            opposingTeam,
                                            result: "Pending", // No sabemos quién ganó todavía
                                        };
                                    } else {
                                        console.error("No se encontró un partido que coincida con la fecha.");
                                        gameDetails = {
                                            gameName: "Unknown Match",
                                            gameId: "Not Found",
                                        };
                                    }
                                }
                            } catch (error) {
                                console.error("Error fetching team schedule:", error.message);
                                gameDetails = {
                                    gameName: "Error fetching match data",
                                    gameId: "Error",
                                };
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching game details for game ID ${bet.game_id}:`, error.message);
                        gameDetails = { gameName: 'Error fetching game data', gameId: 'Error' };
                    }

                    return {
                        ...bet,
                        ...gameDetails,
                        created_at: new Date(bet.created_at).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                        }).toUpperCase(),
                        winnings: result === "Win" ? bet.amount * 2 : 0,
                        result,
                    };
                })
            );

            res.json(detailedBets);
        });
    } catch (error) {
        console.error('Error in /get-bet-history:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});



app.get('/check-bet-result/:id', isAuthenticated, async (req, res) => {
    const betId = req.params.id;

    const query = `
        SELECT 
            b.id AS bet_id, 
            b.game_id, 
            b.amount, 
            b.team_bet_on AS team 
        FROM bets b
        WHERE b.id = ?
    `;

    try {
        db.query(query, [betId], async (err, results) => {
            if (err) {
                console.error('Error fetching bet result:', err);
                return res.status(500).json({ error: 'Error fetching bet result.' });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: 'Bet not found.' });
            }

            const bet = results[0];

            // Fetch game details from the external API
            try {
                const apiResponse = await fetch(`https://${API_HOST}/nfl-single-events?id=${bet.game_id}`, {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': API_KEY,
                        'x-rapidapi-host': API_HOST,
                    },
                });

                if (!apiResponse.ok) {
                    throw new Error(`Failed to fetch game details: ${apiResponse.statusText}`);
                }

                const gameData = await apiResponse.json();
                const winningTeam = gameData.competitions[0].competitors.find(c => c.winner)?.team?.displayName;

                const result = winningTeam
                    ? (bet.team === winningTeam ? 'Win' : 'Lose')
                    : 'Pending';

                const winnings = result === 'Win' ? bet.amount * 2 : 0;

                res.json({
                    result,
                    winnings,
                    amount: bet.amount,
                    winningTeam,
                });
            } catch (apiError) {
                console.error(`Error fetching game data for bet ID ${betId}:`, apiError.message);
                res.status(500).json({ error: 'Error fetching game data from the API.' });
            }
        });
    } catch (error) {
        console.error('Error in /check-bet-result:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});




app.get('/get-all-users', isAuthenticated, (req, res) => {
    if (req.session.user.role !== 'developer') {
        return res.status(403).json({ error: 'Access denied' });
    }
    const query = 'SELECT id, username, balance FROM users';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Error fetching users' });
        }
        res.json(results);
    });
});

app.get('/get-user-bets/:id', (req, res) => {
    const userId = req.params.id;

    const query = `
        SELECT b.game_id, b.amount, b.team_bet_on, b.created_at
        FROM bets b
        WHERE b.user_id = ?;
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user bets:', err);
            res.status(500).json({ error: 'Error fetching user bets' });
        } else {
            res.json(results);
        }
    });
});

app.post('/update-game-results', (req, res) => {
    const { gameId, winningTeam } = req.body;

    if (!gameId || !winningTeam) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Updating game results for:', { gameId, winningTeam });

    // Step 1: Update the games table with the winning team
    const updateGameQuery = 'UPDATE games SET winning_team = ?, correct_game_id = ? WHERE game_id = ? OR live_game_id = ?';
    db.query(updateGameQuery, [winningTeam, gameId, gameId, gameId], (err, result) => {
        if (err) {
            console.error('Error updating game results:', err);
            return res.status(500).json({ error: 'Error updating game results.' });
        }

        console.log(`Game ${gameId} updated with winning team: ${winningTeam}`);

        // Step 2: Update the bets table based on the winning team
        const updateBetsQuery = `
            UPDATE bets 
            SET result = CASE 
                WHEN team_bet_on = ? THEN 'Win'
                ELSE 'Lose'
            END,
            winnings = CASE 
                WHEN team_bet_on = ? THEN amount * 2
                ELSE 0
            END
            WHERE game_id = ?`;

        db.query(updateBetsQuery, [winningTeam, winningTeam, gameId], (err, result) => {
            if (err) {
                console.error('Error updating bets:', err);
                return res.status(500).json({ error: 'Error updating bets.' });
            }

            console.log('Bets updated successfully:', result);

            // Step 3: Send response
            res.json({ success: true, message: 'Game results and bets updated successfully.' });
        });
    });
});


async function updateGameResultsFromAPI() {
    try {
        const response = await fetch('https://nfl-api-data.p.rapidapi.com/nfl-single-events', {
            method: 'GET',
            headers: {
                'x-rapidapi-key': process.env.API_KEY,
                'x-rapidapi-host': process.env.API_HOST
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const games = await response.json();

        if (!Array.isArray(games)) {
            console.error('API response is not an array:', games);
            return;
        }

        for (const game of games) {
            const gameId = game.id;
            const winningTeam = game.competitors.find(team => team.winner)?.team?.displayName;

            if (!winningTeam) {
                console.warn(`No winning team found for game ${gameId}`);
                continue;
            }

            // Update game results in the database
            const updateResponse = await fetch('http://localhost:3000/update-game-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId, winningTeam })
            });

            if (!updateResponse.ok) {
                console.error(`Failed to update game ${gameId}`);
            } else {
                console.log(`Successfully updated game ${gameId} with winner ${winningTeam}`);
            }
        }
    } catch (error) {
        console.error('Error updating game results:', error);
    }
}
// Scheduled task to call updateGameResultsFromAPI every minute
cron.schedule('*/1 * * * *', () => {
    console.log('Running scheduled task: Updating game results...');
    updateGameResultsFromAPI();
});


app.post('/test', (req, res) => {
    res.json({ message: 'Test successful' });
});


////////////////////////////////////////////////////////
//////////PARA LO DEL BUSCADOR DE JUEGOS IDs////////////°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°||    
////////////////////////////////////////////////////////
const teamScheduleCache = {};
const teamMap = {
    "Atlanta Falcons": 1,
    "Buffalo Bills": 2,
    "Chicago Bears": 3,
    "Cincinnati Bengals": 4,
    "Cleveland Browns": 5,
    "Dallas Cowboys": 6,
    "Denver Broncos": 7,
    "Detroit Lions": 8,
    "Green Bay Packers": 9,
    "Tennessee Titans": 10,
    "Indianapolis Colts": 11,
    "Kansas City Chiefs": 12,
    "Las Vegas Raiders": 13,
    "Los Angeles Rams": 14,
    "Miami Dolphins": 15,
    "Minnesota Vikings": 16,
    "New England Patriots": 17,
    "New Orleans Saints": 18,
    "New York Giants": 19,
    "New York Jets": 20,
    "Philadelphia Eagles": 21,
    "Arizona Cardinals": 22,
    "Pittsburgh Steelers": 23,
    "Los Angeles Chargers": 24,
    "San Francisco 49ers": 25,
    "Seattle Seahawks": 26,
    "Tampa Bay Buccaneers": 27,
    "Washington Commanders": 28,
    "Carolina Panthers": 29,
    "Jacksonville Jaguars": 30,
};

// Ruta para buscar el ID del juego
app.post('/search-game-id', async (req, res) => {
    console.log('Request received:', req.body);
    let { homeTeam, awayTeam, gameDate } = req.body;

    try {
        console.log(`Buscando datos para ${homeTeam} vs ${awayTeam} en ${gameDate}...`);

        // Sumar un día a la fecha proporcionada por el usuario
        const inputDate = new Date(gameDate);
        inputDate.setDate(inputDate.getDate() + 1); // Suma 1 día//ESTAR ATENTO DE ESTO PORQUE PUEDE QUE LO ARREGLEN EN LA API Y YA NO SEA NECESARIO AÑADIR +1, DO NOT DELET THIS COMMENT
        const adjustedGameDate = inputDate.toISOString().split('T')[0]; // Convertir de nuevo a YYYY-MM-DD
        console.log(`Fecha ajustada para la búsqueda: ${adjustedGameDate}`);

        const teamSchedules = await Promise.all([
            fetchTeamScheduleWithDelay(homeTeam, 0),
            fetchTeamScheduleWithDelay(awayTeam, 3000),
        ]);

        const games = teamSchedules.flat();
        console.log('Juegos combinados:', games);

        // Filtrar correctamente por la fecha ajustada
        const matchingGame = games.find(game => {
            const competitors = game.competitions?.[0]?.competitors || [];
            const home = competitors.find(c => c.homeAway === 'home')?.team?.displayName === homeTeam;
            const away = competitors.find(c => c.homeAway === 'away')?.team?.displayName === awayTeam;

            // Extraer solo la parte de la fecha (YYYY-MM-DD) y compararla con la ajustada
            const gameDateOnly = game.date.split('T')[0];
            return home && away && gameDateOnly === adjustedGameDate;
        });

        if (matchingGame) {
            console.log('Juego encontrado:', matchingGame.id);
            res.json({ gameId: matchingGame.id });
        } else {
            console.log('No se encontró un juego con los criterios proporcionados.');
            res.status(404).json({ gameId: null, error: 'No se encontró un juego con los criterios proporcionados.' });
        }
    } catch (error) {
        console.error('Error en /search-game-id:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor.' });
    }
});




// Función para obtener el ID del equipo por su nombre
function getTeamIdByName(teamName) {
    return teamMap[teamName] || null;
}

// Función para obtener el horario del equipo
async function fetchTeamSchedule(teamName) {
    const teamId = teamMap[teamName];
    if (!teamId) {
        throw new Error(`No se encontró un equipo con el nombre "${teamName}".`);
    }

    if (teamScheduleCache[teamId]) {
        console.log(`Datos obtenidos de la cache para "${teamName}".`);
        return teamScheduleCache[teamId];
    }

    try {
        console.log(`Solicitando datos para "${teamName}"...`);
        const response = await fetch(`https://${process.env.API_HOST}/nfl-team-schedule?id=${teamId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': process.env.API_KEY,
                'x-rapidapi-host': process.env.API_HOST,
            },
        });

        if (response.status === 401) {
            throw new Error(`Error de autenticación para "${teamName}". Verifica tu clave API.`);
        }

        if (response.status === 429) {
            console.warn(`Demasiadas solicitudes para "${teamName}". Retentando después de 5 segundos.`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return fetchTeamSchedule(teamName); // Reintentar después de un retraso
        }

        if (!response.ok) {
            throw new Error(`Error al obtener datos del equipo "${teamName}": ${response.statusText}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.events)) {
            throw new Error(`La respuesta de la API no contiene datos válidos para el equipo "${teamName}".`);
        }

        teamScheduleCache[teamId] = data.events; // Guardar en cache
        return data.events;
    } catch (error) {
        console.error(`Error en fetchTeamSchedule para "${teamName}":`, error.message);
        throw error;
    }
}

async function fetchTeamScheduleWithDelay(teamName, delay) {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const result = await fetchTeamSchedule(teamName);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }, delay);
    });
}

app.get('/test-api', async (req, res) => {
    try {
        const response = await fetch(`https://${API_HOST}/nfl-single-events?id=401547401`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': API_HOST,
            },
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta de la API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error llamando a la API:', error.message);
        res.status(500).json({ error: error.message });
    }
});