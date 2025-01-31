document.addEventListener('DOMContentLoaded', () => {
    const liveGamesList = document.getElementById('live-games-list');
    const noLiveGamesMessage = document.getElementById('no-live-games');
    const loadingMessage = document.getElementById('loading-message');

    const fallbackLogo = 'path/to/default-logo.png'; // Ruta al logo predeterminado
    const baseLogoURL = 'https://a.espncdn.com/i/teamlogos/nfl/500'; // Base para las URLs de los logos
    const apiKey = '2b5338f5ecmshe206c499500d2a5p1bc461jsnf003ac6a0efb';
    const apiHost = 'nfl-api-data.p.rapidapi.com';
    const TIMEOUT_LIMIT = 30000; // Límite de tiempo en milisegundos (30 segundos)

    // Función para cargar imágenes con fallback
    function loadImage(url, fallbackUrl) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(url);
            img.onerror = () => resolve(fallbackUrl);
        });
    }

    // Función para cargar los juegos en vivo con límite de tiempo y reintentos
    async function fetchLiveGamesWithRetries() {
        const startTime = Date.now(); // Registrar el inicio del proceso
        let success = false;

        while (!success) {
            if (Date.now() - startTime > TIMEOUT_LIMIT) {
                // Si se excede el tiempo límite
                loadingMessage.style.display = 'none';
                noLiveGamesMessage.style.display = 'block';
                noLiveGamesMessage.textContent = 'No games available now. Please try again later.';
                return;
            }

            try {
                // Mostrar mensaje de carga
                loadingMessage.style.display = 'block';

                // Llamada a la API de juegos en vivo
                const response = await fetch(`https://${apiHost}/nfl-livescores`, {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': apiKey,
                        'x-rapidapi-host': apiHost,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP Error: ${response.status}`);
                }

                const data = await response.json();
                const liveGames = data.live || [];

                // Si los datos se obtuvieron correctamente, detener los reintentos
                if (liveGames.length > 0) {
                    success = true;
                    renderLiveGames(liveGames); // Renderizar los juegos
                    loadingMessage.style.display = 'none'; // Ocultar el mensaje de carga
                } else {
                    console.warn('No live games found. Retrying...');
                }
            } catch (error) {
                console.warn('Failed to fetch live games. Retrying...', error);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar antes del siguiente intento
            }
        }
    }

    // Modificar la función renderLiveGames para incluir botones de apuesta
    function getAbbreviatedTeamName(teamName) {
        // Mapeo de nombres completos a abreviaturas
        const teamAbbreviations = {
            "Denver Broncos": "den",
            "Pittsburgh Steelers": "pit",
            "New England Patriots": "ne",
            "Kansas City Chiefs": "kc",
            // Agrega los nombres y abreviaturas de otros equipos aquí
        };
        return teamAbbreviations[teamName] || "default"; // Usa "default" si no se encuentra el equipo
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
    
            // Añadir evento al botón de apuesta
            gameItem.querySelector('.bet-button').addEventListener('click', () => {
                redirectToBettingScreen(game);
            });
    
            liveGamesList.appendChild(gameItem);
        });
    }
    

    function redirectToBettingScreen(game) {
        // Obtener los detalles de los equipos y sus logos
        const homeTeam = game.homeCompetitor;
        const awayTeam = game.awayCompetitor;
    
        // Crear el objeto con los detalles necesarios
        const selectedGame = {
            id: game.id,
            homeTeam: homeTeam.name,
            awayTeam: awayTeam.name,
            date: game.gameTimeDisplay,
            venue: game.venue?.fullName || 'Unknown Venue',
            homeTeamLogo: `${baseLogoURL}/${homeTeam.nameForURL.toLowerCase()}.png`,
            awayTeamLogo: `${baseLogoURL}/${awayTeam.nameForURL.toLowerCase()}.png`,
        };
    
        // Guardar en localStorage
        localStorage.setItem('selectedGame', JSON.stringify(selectedGame));
    
        // Redirigir a la página de apuestas
        window.location.href = 'index_betting.html';
    }

    // Iniciar la carga de los juegos en vivo
    fetchLiveGamesWithRetries();
    
});
