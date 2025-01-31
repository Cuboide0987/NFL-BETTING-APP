// Archivo unificado: app.js

// Configuración global
const API_KEY = '2b5338f5ecmshe206c499500d2a5p1bc461jsnf003ac6a0efb';
const API_HOST = 'nfl-api-data.p.rapidapi.com';

// Funciones Comunes
function setupMenuButton() {
    const menuButton = document.getElementById('menu-button');
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            window.location.href = 'prueba.html';
        });
    }
}

async function setupLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/logout', { method: 'POST', credentials: 'include' });
                if (response.ok) {
                    window.location.href = 'index.html';
                } else {
                    alert('Failed to log out. Please try again.');
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}


async function fetchUserData() {
    try {
        const response = await fetch('/session-user', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching user data:', error);
        const usernameDisplay = document.getElementById('username-display');
        const balanceDisplay = document.getElementById('balance-display');
        if (usernameDisplay) usernameDisplay.textContent = 'Error loading user';
        if (balanceDisplay) balanceDisplay.textContent = '';
        return null;
    }
}


function updateUserInfo() {
    fetchUserData().then(user => {
        const usernameDisplay = document.getElementById('username-display');
        const balanceDisplay = document.getElementById('balance-display');
        if (user) {
            if (usernameDisplay) usernameDisplay.textContent = `Welcome, ${user.username}`;
            if (balanceDisplay) balanceDisplay.textContent = ` | Balance: $${user.balance}`;
        } else {
            if (usernameDisplay) usernameDisplay.textContent = 'Guest';
            if (balanceDisplay) balanceDisplay.textContent = '';
        }
    });
}


// Funciones Específicas por Página
function setupMainMenu() {
    const currentGamesButton = document.getElementById('show-current-games');
    const upcomingGamesButton = document.getElementById('view-upcoming');
    const pastGamesButton = document.getElementById('view-past');
    const yourBetsButton = document.getElementById('view-bets');

    if (currentGamesButton) {
        currentGamesButton.addEventListener('click', () => {
            console.log('Navigating to Current Games');
            window.location.href = 'index_current_games.html';
        });
    }

    if (upcomingGamesButton) {
        upcomingGamesButton.addEventListener('click', () => {
            console.log('Navigating to Upcoming Games');
            window.location.href = 'index_upcoming_games.html';
        });
    }

    if (pastGamesButton) {
        pastGamesButton.addEventListener('click', () => {
            console.log('Navigating to Past Games');
            window.location.href = 'index_past_games.html';
        });
    }

    if (yourBetsButton) {
        yourBetsButton.addEventListener('click', () => {
            console.log('Navigating to Your Bets');
            window.location.href = 'index_your_bets.html';
        });
    }
}


function setupCurrentGamesPage() {
    const liveGamesList = document.getElementById('live-games-list');
    const noLiveGamesMessage = document.getElementById('no-live-games');
    const loadingMessage = document.getElementById('loading-message');
    const API_HOST = 'nfl-api-data.p.rapidapi.com';
    const API_KEY = '2b5338f5ecmshe206c499500d2a5p1bc461jsnf003ac6a0efb';
    const baseLogoURL = 'https://a.espncdn.com/i/teamlogos/nfl/500';
    const TIMEOUT_LIMIT = 10000; // Tiempo total para intentar en ms

    function getAbbreviatedTeamName(teamName) {
        const teamAbbreviations = {
            "Arizona Cardinals": "ari",
            "Atlanta Falcons": "atl",
            "Baltimore Ravens": "bal",
            "Buffalo Bills": "buf",
            "Carolina Panthers": "car",
            "Chicago Bears": "chi",
            "Cincinnati Bengals": "cin",
            "Cleveland Browns": "cle",
            "Dallas Cowboys": "dal",
            "Denver Broncos": "den",
            "Detroit Lions": "det",
            "Green Bay Packers": "gb",
            "Houston Texans": "hou",
            "Indianapolis Colts": "ind",
            "Jacksonville Jaguars": "jax",
            "Kansas City Chiefs": "kc",
            "Las Vegas Raiders": "lv",
            "Los Angeles Chargers": "lac",
            "Los Angeles Rams": "lar",
            "Miami Dolphins": "mia",
            "Minnesota Vikings": "min",
            "New England Patriots": "ne",
            "New Orleans Saints": "no",
            "New York Giants": "nyg",
            "New York Jets": "nyj",
            "Philadelphia Eagles": "phi",
            "Pittsburgh Steelers": "pit",
            "San Francisco 49ers": "sf",
            "Seattle Seahawks": "sea",
            "Tampa Bay Buccaneers": "tb",
            "Tennessee Titans": "ten",
            "Washington Commanders": "was",
        };
        return teamAbbreviations[teamName] || "default";
    }    

    async function fetchLiveGamesWithRetries() {
        const startTime = Date.now();
        let success = false;

        while (!success) {
            if (Date.now() - startTime > TIMEOUT_LIMIT) {
                loadingMessage.style.display = 'none';
                noLiveGamesMessage.style.display = 'block';
                noLiveGamesMessage.textContent = 'No games available now. Please try again later.';
                return;
            }

            try {
                loadingMessage.style.display = 'block';

                const response = await fetch(`https://${API_HOST}/nfl-livescores`, {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': API_KEY,
                        'x-rapidapi-host': API_HOST,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const data = await response.json();
                const liveGames = data.live || [];

                if (liveGames.length > 0) {
                    success = true;
                    renderLiveGames(liveGames);
                    loadingMessage.style.display = 'none';
                } else {
                    console.warn('No live games found. Retrying...');
                }
            } catch (error) {
                console.warn('Failed to fetch live games. Retrying...', error);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar antes del siguiente intento
            }
        }
    }

    function renderLiveGames(liveGames) {
        noLiveGamesMessage.style.display = 'none';
        liveGamesList.innerHTML = '';

        liveGames.forEach((game) => {
            const homeTeamAbbreviation = getAbbreviatedTeamName(game.homeCompetitor.name);
            const awayTeamAbbreviation = getAbbreviatedTeamName(game.awayCompetitor.name);

            const gameItem = document.createElement('div');
            gameItem.classList.add('game-item');

            gameItem.innerHTML = `
                <div class="game-teams">
                    <div class="team">
                        <img src="${baseLogoURL}/${homeTeamAbbreviation}.png" alt="${game.homeCompetitor.name} Logo">
                        <p>${game.homeCompetitor.name}</p>
                    </div>
                    <span>vs</span>
                    <div class="team">
                        <img src="${baseLogoURL}/${awayTeamAbbreviation}.png" alt="${game.awayCompetitor.name} Logo">
                        <p>${game.awayCompetitor.name}</p>
                    </div>
                </div>
                <p class="game-status">Status: ${game.shortStatusText}</p>
                <button class="bet-button" data-game-id="${game.id}">Bet</button>
            `;

            gameItem.querySelector('.bet-button').addEventListener('click', () => {
                const selectedGame = {
                    id: game.id,
                    homeTeam: game.homeCompetitor.name,
                    awayTeam: game.awayCompetitor.name,
                    date: game.gameTimeDisplay,
                    venue: game.venue?.fullName || "Unknown Venue",
                };

                localStorage.setItem('selectedGame', JSON.stringify(selectedGame));
                window.location.href = 'index_betting.html';
            });

            liveGamesList.appendChild(gameItem);
        });
    }

    fetchLiveGamesWithRetries();
}

  

function setupPastGamesPage() {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    async function fetchPastGames() {
        try {
            const response = await fetch(`https://${API_HOST}/nfl-events?year=2023`, {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': API_KEY,
                    'x-rapidapi-host': API_HOST,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch past games');
            const data = await response.json();
            renderGames(data.events || []);
        } catch (error) {
            console.error('Error fetching past games:', error);
        }
    }

    function renderGames(games) {
        gamesContainer.innerHTML = '';
        games.forEach(game => {
            const gameItem = document.createElement('div');
            gameItem.classList.add('game-item');
            gameItem.innerHTML = `
                <h3>${game.competitions[0]?.homeTeam} vs ${game.competitions[0]?.awayTeam}</h3>
                <p>Date: ${new Date(game.date).toLocaleString()}</p>
            `;
            gamesContainer.appendChild(gameItem);
        });
    }

    fetchPastGames();
}

async function setupUpcomingGamesPage() {
    const gamesList = document.getElementById('games-list');
    if (!gamesList) {
        console.error('games-list element not found. Upcoming Games cannot be loaded.');
        return;
    }

    const loadMoreButton = document.createElement('button');
    const loadingSpinner = document.createElement('div');

    const TIMEOUT_LIMIT = 30000;
    let timeoutExceeded = false;
    let allGames = [];
    let displayedGames = 0;

    // Configurar botón "Load More"
    loadMoreButton.textContent = 'Load More';
    loadMoreButton.classList.add('btn');
    loadMoreButton.style.marginTop = '20px';
    loadMoreButton.style.display = 'none';
    gamesList.parentNode.appendChild(loadMoreButton);

    loadingSpinner.classList.add('loading-spinner');
    gamesList.parentNode.insertBefore(loadingSpinner, gamesList);

    const teamIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

    async function fetchAllGames() {
        loadingSpinner.style.display = 'block';
        const games = [];
        const currentDate = new Date();

        for (const teamId of teamIds) {
            const teamGames = await fetchTeamSchedule(teamId);
            const futureGames = teamGames.filter(game => new Date(game.date) >= currentDate);
            games.push(...futureGames);
        }

        loadingSpinner.style.display = 'none';

        if (games.length === 0) {
            displayErrorMessage();
            return;
        }

        allGames = mergeGames(games).sort((a, b) => new Date(a.date) - new Date(b.date));
        displayGames(9);

        // Mostrar el botón si hay más juegos
        if (allGames.length > 9) {
            loadMoreButton.style.display = 'block';
        }
    }

    async function fetchTeamSchedule(teamId) {
        try {
            const response = await fetch(`https://${API_HOST}/nfl-team-schedule?id=${teamId}`, {
                method: 'GET',
                headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': API_HOST },
            });
            if (!response.ok) throw new Error(`Failed to fetch schedule for team ${teamId}`);
            const data = await response.json();
            return data.events || [];
        } catch (error) {
            console.error(`Error fetching team schedule for team ${teamId}:`, error);
            return [];
        }
    }

    function mergeGames(games) {
        const seen = new Set();
        return games.filter(game => {
            if (seen.has(game.id)) return false;
            seen.add(game.id);
            return true;
        });
    }

    function createGameItem(game) {
        const competition = game.competitions[0];
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home').team;
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away').team;
        const venue = competition.venue;
    
        const gameItem = document.createElement('div');
        gameItem.classList.add('game-item');
        gameItem.innerHTML = `
            <div class="game-header">
                <div class="game-teams">
                    <div class="team">
                        <img src="${homeTeam.logos[0]?.href || ''}" alt="${homeTeam.displayName} Logo">
                        <p>${homeTeam.displayName}</p>
                    </div>
                    <span>vs</span>
                    <div class="team">
                        <img src="${awayTeam.logos[0]?.href || ''}" alt="${awayTeam.displayName} Logo">
                        <p>${awayTeam.displayName}</p>
                    </div>
                </div>
            </div>
            <button class="bet-button" data-game-id="${game.id}">BET</button>
        `;
    
        const betButton = gameItem.querySelector('.bet-button');
        betButton.addEventListener('click', () => {
            const selectedGame = {
                id: game.id,
                homeTeam: homeTeam.displayName,
                awayTeam: awayTeam.displayName,
                homeTeamLogo: homeTeam.logos[0]?.href || '', // URL del logo del equipo local
                awayTeamLogo: awayTeam.logos[0]?.href || '', // URL del logo del equipo visitante
                date: game.date,
                venue: venue?.fullName || "Unknown Venue",
            };
    
            localStorage.setItem('selectedGame', JSON.stringify(selectedGame));
            window.location.href = 'index_betting.html';
        });
    
        return gameItem;
    }
    
    

    function displayGames(count) {
        const gamesToShow = allGames.slice(displayedGames, displayedGames + count);
        gamesToShow.forEach(game => {
            const gameItem = createGameItem(game);
            gamesList.appendChild(gameItem);
        });
        displayedGames += gamesToShow.length;

        // Mostrar el botón si hay más juegos para cargar
        if (displayedGames < allGames.length) {
            loadMoreButton.style.display = 'block';
        } else {
            loadMoreButton.style.display = 'none'; // Ocultar si ya no hay juegos
        }
    }

    function displayErrorMessage() {
        gamesList.innerHTML = '<p class="error-message">No games found or the request timed out. Please try again later.</p>';
    }

    loadMoreButton.addEventListener('click', () => {
        displayGames(9);
    });

    fetchAllGames();
}





async function fetchTeamSchedule(teamId) {
    try {
        const response = await fetch(`https://${API_HOST}/nfl-team-schedule?id=${teamId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': API_HOST
            }
        });

        if (!response.ok) {
            console.error(`Error fetching schedule for team ${teamId}: ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        return data.events || [];
    } catch (error) {
        console.error(`Error fetching team schedule for team ${teamId}:`, error);
        return [];
    }
}


// Ajustes en app.js para manejar el descuento del saldo en la página de apuestas
function setupBettingPage() {
    const betForm = document.getElementById('bet-form');
    const betAmountInput = document.getElementById('bet-amount');
    const balanceDisplay = document.getElementById('balance-display');
    const moreInfoButton = document.getElementById('more-info-btn'); // Button to toggle game details
    const moreInfoContainer = document.getElementById('more-info-container'); // Container for game details
    const gameIdDisplay = document.getElementById('game-id-display'); // Element to display game ID
    const gameVenueDisplay = document.getElementById('game-venue-display'); // Element to display venue
    const gameDateDisplay = document.getElementById('game-date-display'); // Element to display date
    const selectedGame = JSON.parse(localStorage.getItem('selectedGame'));
    let selectedTeam = '';

    // Display Game Details
    if (!selectedGame) {
        alert("No game selected. Please go back and select a game.");
        return;
    }
    gameIdDisplay.textContent = selectedGame.id || "Unknown ID";
    gameVenueDisplay.textContent = selectedGame.venue || "Unknown Venue";
    gameDateDisplay.textContent = new Date(selectedGame.date).toLocaleString() || "Unknown Date";

    async function fetchAndUpdateBalance() {
        try {
            const response = await fetch('/session-user', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch user data');
            const userData = await response.json();

            // Update DOM elements
            balanceDisplay.textContent = ` | Balance: $${userData.balance}`;
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) usernameDisplay.textContent = `Welcome, ${userData.username}`;
        } catch (error) {
            console.error('Error fetching user balance:', error);
        }
    }

    betForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const betAmount = parseFloat(betAmountInput.value);

        if (!selectedTeam) {
            alert('Please select a team.');
            return;
        }

        if (!betAmount || betAmount < 10) {
            alert('The minimum bet amount is $10.');
            return;
        }

        try {
            const response = await fetch('/place-bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    betAmount,
                    selectedTeam,
                    gameId: selectedGame.id,
                }),
            });

            const result = await response.json();

            if (response.ok) {
                alert('Bet placed successfully!');
                await fetchAndUpdateBalance(); // Update the balance after placing the bet
            } else {
                alert(result.error || 'Failed to place the bet.');
            }
        } catch (error) {
            console.error('Error placing the bet:', error);
            alert('Failed to place the bet. Please try again later.');
        }
    });

    // Team selection logic
    const teamLogoContainer = document.querySelector('.team-logo-container');
    if (selectedGame) {
        const homeTeamLogo = `
            <div class="team-logo" data-team="${selectedGame.homeTeam}">
                <img src="${selectedGame.homeTeamLogo}" alt="${selectedGame.homeTeam} Logo">
                <span>${selectedGame.homeTeam}</span>
            </div>`;
        const awayTeamLogo = `
            <div class="team-logo" data-team="${selectedGame.awayTeam}">
                <img src="${selectedGame.awayTeamLogo}" alt="${selectedGame.awayTeam} Logo">
                <span>${selectedGame.awayTeam}</span>
            </div>`;

        teamLogoContainer.innerHTML = homeTeamLogo + awayTeamLogo;

        document.querySelectorAll('.team-logo').forEach((logo) => {
            logo.addEventListener('click', () => {
                document.querySelectorAll('.team-logo').forEach((l) => l.classList.remove('selected'));
                logo.classList.add('selected');
                selectedTeam = logo.getAttribute('data-team');
            });
        });
    } else {
        alert('No game selected. Please go back and select a game.');
    }
}



// Función para inicializar la página de prueba
function setupMainPage() {
    const balanceDisplay = document.getElementById('balance-display');

    // Función para obtener y mostrar el balance del usuario
    async function fetchAndDisplayBalance() {
        try {
            const response = await fetch('/session-user', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch user balance');
            const userData = await response.json();
            balanceDisplay.textContent = ` | Balance: $${userData.balance}`;
        } catch (error) {
            console.error('Error fetching balance:', error);
            balanceDisplay.textContent = ' | Balance: Error';
        }
    }

    // Llama a la función una vez al cargar la página
    fetchAndDisplayBalance();

    fetchAndUpdateBalance(); // Actualiza el balance al cargar
    setInterval(fetchAndUpdateBalance, 10000); // Actualiza cada 10 segundos

    // Actualiza el balance automáticamente cada 10 segundos
    setInterval(fetchAndDisplayBalance, 10000);
}



// Asegúrate de que `setupMainPage` se llame correctamente
function setupPage() {
    const pageId = document.body.id;

    if (pageId === 'main-menu') {
        setupMainPage();
    }

    // Otros setups específicos pueden añadirse aquí
}

document.addEventListener('DOMContentLoaded', setupPage);


// Asegúrate de que se llame `setupMainPage` cuando se cargue `prueba.html`
function setupPage() {
    const pageId = document.body.id;

    if (pageId === 'main-menu') {
        setupMainPage();
    }

    // Otros setups específicos pueden añadirse aquí
}
document.addEventListener('DOMContentLoaded', setupPage);


// Verificar ID de página y ejecutar la lógica adecuada
function setupPage() {
    const pageId = document.body.id;

    if (pageId === 'main-menu') {
        setupMainPage();
    } else if (pageId === 'index-betting') {
        setupBettingPage();
    }

    // Otros setups específicos pueden añadirse aquí
}

document.addEventListener('DOMContentLoaded', setupPage);
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////

function setupYourBetsPage() {
    const betList = document.getElementById('bet-list');

    async function loadBetHistory() {
        try {
            const response = await fetch('/get-bet-history', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch bet history.');
    
            const bets = await response.json();
            betList.innerHTML = ''; // Clear the list
    
            bets.forEach(bet => {
                const listItem = document.createElement('li');
                const winningsMessage = bet.result === 'Win'
                    ? `<p style="color: green;">You won! Total winnings: $${bet.winnings}</p>`
                    : bet.result === 'Lose'
                        ? `<p style="color: red;">Better luck next time!</p>`
                        : '<p>Pending result...</p>';
    
                listItem.innerHTML = `
                    <div>
                        <strong>Game:</strong> ${bet.gameName} |
                        <strong>Bet on:</strong> ${bet.team} |
                        <strong>Amount:</strong> $${bet.amount} |
                        <strong>Status:</strong> ${bet.result} |
                        <strong>Game ID:</strong> ${bet.gameId || 'Not Found'}
                        ${winningsMessage}
                        <p><strong>Date:</strong> ${bet.created_at}</p>
                    </div>`;
                betList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error loading bet history:', error);
        }
    }    

    loadBetHistory();
}

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
            console.error(`API Error: ${response.statusText}`);
            return;
        }

        const data = await response.json();
        if (!Array.isArray(data.events)) {
            console.error('Expected an array but got:', data);
            return;
        }

        data.events.forEach(async (event) => {
            const correctGameId = event.id;
            const winningTeam = event.competitors.find((team) => team.winner)?.team?.displayName;

            if (!winningTeam) {
                console.warn(`No winning team found for game ${correctGameId}`);
                return;
            }

            await fetch('http://localhost:3000/update-game-results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameId: correctGameId, winningTeam })
            });
        });
    } catch (error) {
        console.error('Error updating game results:', error);
    }
}


// Llamar manualmente a esta función (puedes vincularla a un botón de administración)
document.getElementById('update-results-button').addEventListener('click', () => {
    updateGameResultsFromAPI();
});



function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                if (response.ok) {
                    const data = await response.json();
                    window.location.href = data.redirect;
                } else {
                    const error = await response.json();
                    document.getElementById('response-message').textContent = error.error;
                }
            } catch (error) {
                console.error('Login error:', error);
                document.getElementById('response-message').textContent = 'An error occurred. Please try again.';
            }
        });
    }
}

function setupRegisterForm() {
    // Mostrar/ocultar el campo "Developer Key" según el rol seleccionado
    const roleSelect = document.getElementById('role');
    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            const devPasswordContainer = document.getElementById('developer-password-container');
            if (e.target.value === 'developer') {
                devPasswordContainer.style.display = 'block';
            } else {
                devPasswordContainer.style.display = 'none';
            }
        });
    }

    // Lógica adicional para el formulario de registro
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            const balance = document.getElementById('balance').value || 0;
            const devPassword = document.getElementById('developer-password').value;

            if (role === 'developer' && !devPassword) {
                document.getElementById('response-message').textContent = 'Developer key is required.';
                return;
            }

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role, balance, devPassword }),
                });

                if (response.ok) {
                    document.getElementById('response-message').textContent = 'Registration successful!';
                } else {
                    const error = await response.json();
                    document.getElementById('response-message').textContent = error.error;
                }
            } catch (error) {
                console.error('Register error:', error);
                document.getElementById('response-message').textContent = 'An error occurred. Please try again.';
            }
        });
    }
}
//para lo del boton
document.addEventListener('DOMContentLoaded', () => {
    const increaseButtons = document.querySelectorAll('.increase-balance');
    const decreaseButtons = document.querySelectorAll('.decrease-balance');
    const balanceDisplay = document.querySelector('#balance-display');

    async function updateBalance(action) {
        try {
            const response = await fetch('/update-balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update balance');
            }

            const updatedBalance = await response.json();
            balanceDisplay.textContent = ` | Balance: $${updatedBalance.balance}`;
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }

    increaseButtons.forEach(button => button.addEventListener('click', () => updateBalance('increase')));
    decreaseButtons.forEach(button => button.addEventListener('click', () => updateBalance('decrease')));
});

// Punto de Entrada
function setupPage() {
    const pageId = document.body.id;
    setupMenuButton();
    updateUserInfo();
    setupLogoutButton();

    if (pageId === 'main-menu') {
        setupMainPage();
    }

    switch (pageId) {
        case 'register-page':
            setupRegisterForm();
            break;
        case 'login-page':
            setupLoginForm();
            break;
        case 'main-menu':
            setupMainMenu();
            break;
        case 'index-current-games':
            setupCurrentGamesPage();
            break;
        case 'index-past-games':
            setupPastGamesPage();
            break;
        case 'index-upcoming-games':
            setupUpcomingGamesPage();
            break;
        case 'index-betting':
            setupBettingPage();
            break;
        case 'index-your-bets':
            setupYourBetsPage();
            break;
        default:
            console.warn('No specific setup for this page.');
    }
}

document.addEventListener('DOMContentLoaded', setupPage);


