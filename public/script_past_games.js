document.addEventListener('DOMContentLoaded', () => {
    const gamesContainer = document.getElementById('games-container');
    const loadMoreButton = document.getElementById('load-more-button');
    const noMoreGamesMessage = document.getElementById('no-more-games');

    const apiKey = '2b5338f5ecmshe206c499500d2a5p1bc461jsnf003ac6a0efb';
    const apiHost = 'nfl-api-data.p.rapidapi.com';
    const itemsPerLoad = 81; // Number of games to load per page (3x3 grid)
    let currentOffset = 0; // To keep track of already loaded items
    let gamesData = []; // Cache for the games

    async function fetchGames() {
        try {
            const response = await fetch(`https://${apiHost}/nfl-events?year=2023`, {
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
            return data.events || [];
        } catch (error) {
            console.error('Failed to fetch games:', error);
            return [];
        }
    }

    function renderGames(games) {
        games.forEach(game => {
            const homeCompetitor = game.competitions[0]?.competitors.find(c => c.homeAway === 'home') || {};
            const awayCompetitor = game.competitions[0]?.competitors.find(c => c.homeAway === 'away') || {};

            const homeTeamName = homeCompetitor.team?.displayName || 'Unknown Team';
            const awayTeamName = awayCompetitor.team?.displayName || 'Unknown Team';

            const homeTeamLogo = homeCompetitor.team?.logo || 'path/to/default-logo.png';
            const awayTeamLogo = awayCompetitor.team?.logo || 'path/to/default-logo.png';

            const homeTeamScore = homeCompetitor?.score || 'N/A';
            const awayTeamScore = awayCompetitor?.score || 'N/A';

            const gameDate = new Date(game.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            const gameItem = document.createElement('div');
            gameItem.classList.add('game-item');
            gameItem.innerHTML = `
                <h3>${homeTeamName} vs ${awayTeamName}</h3>
                <div>
                    <img src="${homeTeamLogo}" alt="${homeTeamName} Logo">
                    <span class="vs">VS</span>
                    <img src="${awayTeamLogo}" alt="${awayTeamName} Logo">
                </div>
                <p class="details"><strong>Score:</strong> ${homeTeamScore} - ${awayTeamScore}</p>
                <p class="details"><strong>Date:</strong> ${gameDate}</p>
            `;
            gamesContainer.appendChild(gameItem);
        });
    }

    function loadNextGames() {
        const nextGames = gamesData.slice(currentOffset, currentOffset + itemsPerLoad);
        if (nextGames.length > 0) {
            renderGames(nextGames);
            currentOffset += itemsPerLoad;
        }

        if (currentOffset >= gamesData.length) {
            loadMoreButton.style.display = 'none';
            noMoreGamesMessage.style.display = 'block';
        }
    }

    async function initialize() {
        loadMoreButton.disabled = true; // Prevent multiple clicks during loading
        const games = await fetchGames();
        
        // Sort games by date (descending order: most recent to oldest)
        gamesData = games.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        loadMoreButton.disabled = false;

        if (gamesData.length > 0) {
            loadNextGames();
        } else {
            noMoreGamesMessage.textContent = 'No games found.';
            noMoreGamesMessage.style.display = 'block';
        }
    }

    loadMoreButton.addEventListener('click', loadNextGames);

    initialize();
});
