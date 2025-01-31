document.addEventListener('DOMContentLoaded', () => {
    const gameDetailsContainer = document.getElementById('game-details');
    const teamLogoContainer = document.querySelector('.team-logo-container');
    const bettingMessage = document.getElementById('betting-message');
    const betForm = document.getElementById('bet-form');
    const betAmountInput = document.getElementById('bet-amount');
    const balanceDisplay = document.getElementById('balance-display');
    const moreInfoButton = document.getElementById('more-info-btn'); // Button for toggling more info
    const moreInfoContainer = document.getElementById('more-info-container'); // Container for additional info
    const gameIdDisplay = document.getElementById('game-id-display');
    const gameVenueDisplay = document.getElementById('game-venue-display');
    const gameDateDisplay = document.getElementById('game-date-display');
    let selectedTeam = '';
    const selectedGame = JSON.parse(localStorage.getItem('selectedGame'));

    // Ensure selectedGame exists
    if (!selectedGame) {
        alert("No game selected. Please go back and select a game.");
        return;
    }

    // Display basic game details
    gameDetailsContainer.innerHTML = `
        <p><strong>Game ID:</strong> ${selectedGame.id}</p>
        <p><strong>Venue:</strong> ${selectedGame.venue || "Unknown Venue"}</p>
        <p><strong>Date:</strong> ${new Date(selectedGame.date).toLocaleString()}</p>
    `;

    // Populate additional info fields
    gameIdDisplay.textContent = selectedGame.id || "Unknown ID";
    gameVenueDisplay.textContent = selectedGame.venue || "Unknown Venue";
    gameDateDisplay.textContent = new Date(selectedGame.date).toLocaleString() || "Unknown Date";

    // Toggle additional information
    moreInfoButton.addEventListener('click', () => {
        if (moreInfoContainer.style.display === 'none' || !moreInfoContainer.style.display) {
            moreInfoContainer.style.display = 'block';
            moreInfoButton.textContent = 'Hide More Info';
        } else {
            moreInfoContainer.style.display = 'none';
            moreInfoButton.textContent = 'Show More Info';
        }
    });

    // Display team logos
    teamLogoContainer.innerHTML = `
    <div class="team-logo" data-team="${selectedGame.homeTeam}">
        <img src="${selectedGame.homeLogo}" alt="${selectedGame.homeTeam} Logo">
        <span>${selectedGame.homeTeam}</span>
    </div>
    <div class="team-logo" data-team="${selectedGame.awayTeam}">
        <img src="${selectedGame.awayLogo}" alt="${selectedGame.awayTeam} Logo">
        <span>${selectedGame.awayTeam}</span>
    </div>
    `;


    // Team selection logic
    document.querySelectorAll('.team-logo').forEach((logo) => {
        logo.addEventListener('click', () => {
            document.querySelectorAll('.team-logo').forEach((l) => l.classList.remove('selected'));
            logo.classList.add('selected');
            selectedTeam = logo.getAttribute('data-team');
            bettingMessage.textContent = `You are betting on: ${selectedTeam}`;
        });
    });

    // Fetch user data and update balance
    async function fetchUserData() {
        try {
            const response = await fetch('/session-user', { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to fetch user data');
            const userData = await response.json();
            if (balanceDisplay) balanceDisplay.textContent = ` | Balance: $${userData.balance}`;
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    }

    fetchUserData();

    // Handle bet submission
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
                await fetchUserData(); // Update balance after placing the bet

                // Update bet history in localStorage (for demonstration)
                let betHistory = JSON.parse(localStorage.getItem('betHistory')) || [];
                betHistory.push({
                    gameId: selectedGame.id,
                    team: selectedTeam,
                    amount: betAmount,
                    date: new Date().toLocaleString(),
                });
                localStorage.setItem('betHistory', JSON.stringify(betHistory));

                // Redirect to "Your Bets" page
                window.location.href = 'index_your_bets.html';
            } else {
                alert(result.error || 'Failed to place the bet.');
            }
        } catch (error) {
            console.error('Error placing the bet:', error);
            alert('Failed to place the bet. Please try again later.');
        }
    });

    // Display bet history on "Your Bets" page
    if (document.body.id === 'index-your-bets') {
        const betList = document.getElementById('bet-list');
        const betHistory = JSON.parse(localStorage.getItem('betHistory')) || [];

        betList.innerHTML = '';
        betHistory.forEach((bet) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <div>
                    <strong>Game ID:</strong> ${bet.gameId} |
                    <strong>Amount:</strong> $${bet.amount} |
                    <strong>Team:</strong> ${bet.team} |
                    <strong>Date:</strong> ${bet.date}
                </div>
            `;
            betList.appendChild(listItem);
        });
    }
});
