document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos
    const showCurrentGamesButton = document.getElementById('show-cuurrent-games');
    const viewUpcomingButton = document.getElementById('view-upcoming');
    const viewPastButton = document.getElementById('view-past');

    // Redirigir a index_current_games.html cuando se presione el botón "Current Games"
    showCurrentGamesButton.addEventListener('click', () => {
        window.location.href = 'index_current_games.html'; // Cambia a la nueva pantalla
    });

    // Redirigir a index_upcoming_games.html cuando se presione el botón "Upcoming Games"
    viewUpcomingButton.addEventListener('click', () => {
        window.location.href = 'index_upcoming_games.html'; // Cambia a la nueva pantalla
    });

    // Redirigir a index_past_games.html cuando se presione el botón "Past Games"
    viewPastButton.addEventListener('click', () => {
        window.location.href = 'index_past_games.html'; // Cambia a la nueva pantalla
    });
});

app.get('/session-user', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('/session-user');
    const user = await response.json();

    if (user.error) {
        alert('No autorizado, redirigiendo a login');
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('username-display').innerText = `Welcome, ${user.username}`;
});

document.getElementById('view-your-bets').addEventListener('click', () => {
    window.location.href = 'index_your_bets.html'; // Redirect to the new "Your Bets" page
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/session-user', {
            method: 'GET',
            credentials: 'include', // Asegura que las cookies de sesión se envíen al servidor
        });

        if (!response.ok) throw new Error('Unauthorized');
        const user = await response.json();

        // Mostrar el nombre de usuario y el balance
        document.getElementById('username-display').innerText = `Welcome, ${user.username}`;
        document.getElementById('balance-display').innerText = ` | Balance: $${user.balance}`;
    } catch (err) {
        alert('Unauthorized. Redirecting to login...');
        window.location.href = '/login.html';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menu-button');
    menuButton.addEventListener('click', () => {
        window.location.href = 'prueba.html'; // Redirige al menú principal
    });
});

// Cargar el banner dinámicamente
document.addEventListener("DOMContentLoaded", function () {
    fetch("banner.html")
        .then(response => response.text())
        .then(html => {
            document.body.insertAdjacentHTML("afterbegin", html);
            loadBannerLogic(); // Cargar la lógica del banner
        })
        .catch(error => console.error("Error loading banner:", error));
});

// Función para obtener información del usuario y actualizar el banner
async function loadBannerLogic() {
    try {
        const response = await fetch('/session-user', { credentials: 'include' });

        if (!response.ok) {
            throw new Error('User not authenticated');
        }

        const user = await response.json();

        // Mostrar datos en el banner
        document.getElementById('username-display').innerText = `Welcome, ${user.username}`;
        document.getElementById('balance-display').innerText = `Balance: $${user.balance}`;

        // Redirección al menú
        document.getElementById('menu-button').addEventListener('click', () => {
            window.location.href = 'prueba.html';
        });

        // Logout
        document.getElementById('logout-button').addEventListener('click', async () => {
            await fetch('/logout', { method: 'POST', credentials: 'include' });
            window.location.href = 'login.html';
        });

    } catch (error) {
        console.error('Error loading user data:', error);
        window.location.href = 'login.html'; // Redirigir si no está autenticado
    }
}
