document.addEventListener('DOMContentLoaded', async () => {
    const gameDetailsContainer = document.getElementById('game-details');
    const teamLogoContainer = document.querySelector('.team-logo-container');
    const bettingMessage = document.getElementById('betting-message');
    const betForm = document.getElementById('bet-form');
    const betAmountInput = document.getElementById('bet-amount');
    const balanceDisplay = document.getElementById('balance-display');
    const moreInfoButton = document.getElementById('more-info-btn'); // Botón para mostrar más info
    const moreInfoContainer = document.getElementById('more-info-container'); // Contenedor para más info
    const gameIdDisplay = document.getElementById('game-id-display'); // ID del juego
    const gameVenueDisplay = document.getElementById('game-venue-display'); // Lugar del juego
    const gameDateDisplay = document.getElementById('game-date-display'); // Fecha del juego

    // Obtener datos del usuario
    async function fetchUserData() {
        try {
            const response = await fetch('/session-user', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }
            const userData = await response.json();
            balanceDisplay.textContent = ` | Balance: $${userData.balance}`;
        } catch (error) {
            console.error('Error fetching user data:', error);
            alert('Could not fetch user data.');
        }
    }

    // Llama a fetchUserData al cargar la página
    await fetchUserData();

    const selectedGame = JSON.parse(localStorage.getItem('selectedGame'));
    let selectedTeam = '';

    if (selectedGame) {
        const homeTeamLogo = `
            <div class="team-logo" data-team="${selectedGame.homeTeam}">
                <img src="${selectedGame.homeTeamLogo}" alt="${selectedGame.homeTeam} Logo">
                <span>${selectedGame.homeTeam}</span>
            </div>
        `;
        const awayTeamLogo = `
            <div class="team-logo" data-team="${selectedGame.awayTeam}">
                <img src="${selectedGame.awayTeamLogo}" alt="${selectedGame.awayTeam} Logo">
                <span>${selectedGame.awayTeam}</span>
            </div>
        `;

        teamLogoContainer.innerHTML = homeTeamLogo + awayTeamLogo;

        const teamLogos = document.querySelectorAll('.team-logo');
        teamLogos.forEach(logo => {
            logo.addEventListener('click', () => {
                teamLogos.forEach(l => l.classList.remove('selected'));
                logo.classList.add('selected');
                selectedTeam = logo.getAttribute('data-team'); // Aquí se asigna el equipo seleccionado
                bettingMessage.textContent = `You are betting on: ${selectedTeam}`;
            });
        });        

        // Llenar detalles para el botón "More Info"
        gameIdDisplay.textContent = selectedGame.id;
        gameVenueDisplay.textContent = selectedGame.venue || 'Unknown Venue';
        gameDateDisplay.textContent = new Date(selectedGame.date).toLocaleString();

        // Configurar el botón "More Info"
        moreInfoButton.addEventListener('click', () => {
            moreInfoContainer.style.display =
                moreInfoContainer.style.display === 'none' ? 'block' : 'none';
        });
    } else {
        bettingMessage.textContent = 'No game selected. Please return to the previous page and select a game.';
    }

    // Manejar el formulario de apuesta
    betForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const betAmount = parseFloat(betAmountInput.value);

        if (!selectedTeam || typeof selectedTeam !== 'string') {
            console.error('Invalid team selected:', selectedTeam);
            alert('Please select a valid team.');
            return;
        }

        if (!betAmount || isNaN(betAmount) || betAmount < 10) {
            console.error('Invalid bet amount:', betAmount);
            alert('Please enter a valid bet amount (minimum $10).');
            return;
        }

        const gameId = selectedGame?.id;
        if (!gameId) {
            alert('Game ID is missing. Please go back and select a game.');
            return;
        }

        try {
            const response = await fetch('/place-bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ betAmount, selectedTeam, gameId }),
            });

            const result = await response.json();

            if (response.ok) {
                alert(`Bet placed successfully!\nGame: ${selectedGame.homeTeam} vs ${selectedGame.awayTeam}\nTeam: ${selectedTeam}\nAmount: $${betAmount}`);
                // Actualiza el saldo después de la apuesta
                await fetchUserData();
                window.location.href = '/prueba.html';
            } else {
                alert(result.error || 'An error occurred while placing the bet.');
            }
        } catch (error) {
            console.error('Error placing bet:', error);
            alert('An error occurred while placing the bet.');
        }
    });
});
