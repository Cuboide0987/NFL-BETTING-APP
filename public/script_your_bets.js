document.addEventListener('DOMContentLoaded', async () => {
    const betList = document.getElementById('bet-list');

    // Función para cargar el historial de apuestas
    async function loadBetHistory() {
        try {
            const response = await fetch('/get-bet-history', { credentials: 'include' });
            if (!response.ok) {
                throw new Error('Failed to fetch bet history.');
            }

            const bets = await response.json();
            betList.innerHTML = ''; // Limpiar la lista

            bets.forEach(bet => {
                const listItem = document.createElement('li');
                const resultClass = bet.result === 'Win' ? 'win' : (bet.result === 'Lose' ? 'lose' : 'pending');
                listItem.classList.add(resultClass);

                listItem.innerHTML = `
                    <div>
                        <strong>Game ID:</strong> ${bet.game_id} | 
                        <strong>Amount:</strong> $${bet.amount} | 
                        <strong>Team:</strong> ${bet.team} | 
                        <strong>Date:</strong> ${new Date(bet.created_at).toLocaleString()}
                    </div>
                    <div class="result ${resultClass}">${bet.result}</div>
                `;
                betList.appendChild(listItem);
            });
        } catch (error) {
            console.error('Error fetching bet history:', error);
            betList.innerHTML = '<li>Error loading bet history.</li>';
        }
    }

    // Llamar a la función al cargar la página
    await loadBetHistory();
});

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            window.location.href = 'prueba.html'; // Redirige al menú principal
        });
    }
});
