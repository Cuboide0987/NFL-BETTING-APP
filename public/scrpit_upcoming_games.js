document.addEventListener('DOMContentLoaded', () => {
    const gamesList = document.getElementById('games-list');
    const loadMoreButton = document.createElement('button');
    const loadingSpinner = document.createElement('div');

    const TIMEOUT_LIMIT = 30000;
    let timeoutExceeded = false;
    let allGames = [];
    let displayedGames = 0; // Contador de juegos ya mostrados
    let lastExpandedGame = null; // Referencia al último juego expandido

    // Configurar botón "Load More"
    loadMoreButton.textContent = 'Load More';
    loadMoreButton.classList.add('btn');
    loadMoreButton.style.marginTop = '20px';
    loadMoreButton.style.display = 'none'; // Se mostrará solo cuando haya más juegos
    gamesList.parentNode.appendChild(loadMoreButton);

    // Spinner de carga
    loadingSpinner.classList.add('loading-spinner');
    gamesList.parentNode.insertBefore(loadingSpinner, gamesList);

    const teamIds = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ];
    const apiKey = '2b5338f5ecmshe206c499500d2a5p1bc461jsnf003ac6a0efb';
    const apiHost = 'nfl-api-data.p.rapidapi.com';

    async function fetchAllGames() {
        const startTime = Date.now();
        loadingSpinner.style.display = 'block';
        const games = [];
        const currentDate = new Date();

        for (const teamId of teamIds) {
            if (Date.now() - startTime > TIMEOUT_LIMIT) {
                timeoutExceeded = true;
                break;
            }
            const teamGames = await fetchTeamSchedule(teamId);
            const futureGames = teamGames.filter(game => new Date(game.date) >= currentDate);
            games.push(...futureGames);
        }

        loadingSpinner.style.display = 'none';

        if (timeoutExceeded || games.length === 0) {
            displayErrorMessage();
            return;
        }

        allGames = mergeGames(games).sort((a, b) => new Date(a.date) - new Date(b.date)); // Orden cronológico
        displayGames(9); // Mostrar los primeros 9 juegos
        if (allGames.length > 9) {
            loadMoreButton.style.display = 'block';
        }
    }

    async function fetchTeamSchedule(teamId) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.withCredentials = true;

            xhr.addEventListener('readystatechange', function () {
                if (this.readyState === this.DONE) {
                    try {
                        const response = JSON.parse(this.responseText);
                        resolve(response.events || []);
                    } catch (error) {
                        reject(error);
                    }
                }
            });

            xhr.open('GET', `https://${apiHost}/nfl-team-schedule?id=${teamId}`);
            xhr.setRequestHeader('x-rapidapi-key', apiKey);
            xhr.setRequestHeader('x-rapidapi-host', apiHost);

            xhr.send();
        });
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

        const gameDateObj = new Date(game.date);
        const day = gameDateObj.getDate().toString().padStart(2, '0');
        const month = gameDateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
        const year = gameDateObj.getFullYear();
        const time = gameDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const location = venue ? `${venue.fullName}, ${venue.address.city}, ${venue.address.state}` : 'Location TBD';

        const gameDate = `${day}-${month}-${year}`;

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
                <p class="game-date">${gameDate}</p>
            </div>
            <div class="game-details">
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Location:</strong> ${location}</p>
                <button class="bet-button" data-game-id="${game.id}">BET</button>
            </div>
        `;

        // Expansión y colapso del recuadro
        gameItem.addEventListener('click', (event) => {
            if (event.target.classList.contains('bet-button')) return;
            if (lastExpandedGame && lastExpandedGame !== gameItem) {
                lastExpandedGame.classList.remove('expanded');
            }
            gameItem.classList.toggle('expanded');
            lastExpandedGame = gameItem.classList.contains('expanded') ? gameItem : null;
        });

        // Redirección al hacer clic en "BET"
        const betButton = gameItem.querySelector('.bet-button');
        betButton.addEventListener('click', () => {
            redirectToBettingScreen(game);
        });

        return gameItem;
    }

    function redirectToBettingScreen(game) {
        // Obtener los detalles de los equipos y sus logos
        const homeTeam = game.competitions[0].competitors.find(c => c.homeAway === 'home').team;
        const awayTeam = game.competitions[0].competitors.find(c => c.homeAway === 'away').team;
    
        // Crear el objeto con los detalles necesarios
        const selectedGame = {
            id: game.id,
            homeTeam: homeTeam.displayName,
            awayTeam: awayTeam.displayName,
            date: game.date,
            venue: game.competitions[0].venue?.fullName || 'Unknown Venue',
            homeTeamLogo: homeTeam.logos[0]?.href || '', // URL del logo del equipo local
            awayTeamLogo: awayTeam.logos[0]?.href || ''  // URL del logo del equipo visitante
        };
    
        // Guardar en localStorage
        localStorage.setItem('selectedGame', JSON.stringify(selectedGame));
    
        // Redirigir a la página de apuestas
        window.location.href = 'index_betting.html';
    }
    

    function displayGames(count) {
        const gamesToShow = allGames.slice(displayedGames, displayedGames + count);
        gamesToShow.forEach(game => {
            const gameItem = createGameItem(game);
            gamesList.appendChild(gameItem);
        });
        displayedGames += gamesToShow.length;

        if (displayedGames >= allGames.length) {
            loadMoreButton.style.display = 'none'; // Ocultar el botón si no quedan más juegos
        }
    }

    function displayErrorMessage() {
        gamesList.innerHTML = '<p class="error-message">No games found or the request timed out. Please try again later.</p>';
    }

    loadMoreButton.addEventListener('click', () => {
        displayGames(9); // Cargar 9 juegos más al hacer clic
    });

    fetchAllGames();
});