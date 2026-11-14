const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos de la interfaz
const playerNameEl = document.getElementById('playerName');
const recordScoreEl = document.getElementById('recordScore');
const recordOwnerEl = document.getElementById('recordOwner');
const pauseBtn = document.getElementById('pauseBtn');
const nameBtn = document.getElementById('nameBtn');
const nameModal = document.getElementById('nameModal');
const nameForm = document.getElementById('nameForm');
const nameInput = document.getElementById('nameInput');
const gameOverModal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const topScoresEl = document.getElementById('topScores');
const restartBtn = document.getElementById('restartBtn');

// Colores que toma la paleta al golpear la pelota
const PADDLE_COLORS = ["#ffffff", "#ff4d6d", "#ffd60a", "#3a86ff", "#06d6a0", "#c77dff", "#ff8500", "#00f5ff"];

// Estado del juego
const paddle = {
    x: 30,
    y: 175,
    width: 15,
    height: 100,
    speed: 6,
    dy: 0,
    color: PADDLE_COLORS[0]
};

const ball = {
    x: 400,
    y: 225,
    radius: 10,
    speedX: 5,
    speedY: 5
};

let score = 0;
let playerName = "";
// Estados posibles: "name" (pidiendo nombre), "playing", "paused", "over"
let state = "name";

// ---------- Guardado de puntajes (localStorage) ----------
function loadScores() {
    try {
        return JSON.parse(localStorage.getItem("pongScores")) || [];
    } catch {
        return [];
    }
}

function saveScore(name, points) {
    const scores = loadScores();
    scores.push({ name, score: points, date: new Date().toISOString() });
    scores.sort((a, b) => b.score - a.score);
    const top = scores.slice(0, 3); // solo guardamos los 3 mejores
    try {
        localStorage.setItem("pongScores", JSON.stringify(top));
    } catch { /* si no se puede guardar, el juego sigue funcionando */ }
    return top;
}

function updateRecordDisplay() {
    const best = loadScores()[0];
    // El récord también sube en vivo si la partida actual lo supera
    if (best && best.score >= score) {
        recordScoreEl.textContent = best.score;
        recordOwnerEl.textContent = "(" + best.name + ")";
    } else {
        recordScoreEl.textContent = score;
        recordOwnerEl.textContent = score > 0 ? "(" + playerName + ")" : "";
    }
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString("es-MX", {
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}

// ---------- Nombre del jugador ----------
function askName() {
    state = "name";
    nameInput.value = playerName;
    nameModal.classList.remove("hidden");
    gameOverModal.classList.add("hidden");
    nameInput.focus();
}

nameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    playerName = name;
    playerNameEl.textContent = playerName;
    try { localStorage.setItem("pongPlayer", playerName); } catch { }
    nameModal.classList.add("hidden");
    resetGame(); // nuevo jugador = partida nueva
    state = "playing";
});

nameBtn.addEventListener("click", () => {
    askName();
    nameBtn.blur();
});

// ---------- Pausa ----------
function togglePause() {
    if (state === "playing") {
        state = "paused";
        pauseBtn.textContent = "▶ Reanudar";
    } else if (state === "paused") {
        state = "playing";
        pauseBtn.textContent = "⏸ Pausa";
    }
}

pauseBtn.addEventListener("click", () => {
    togglePause();
    pauseBtn.blur(); // para que Espacio no vuelva a "presionar" el botón
});

// ---------- Fin del juego ----------
function gameOver() {
    state = "over";
    paddle.dy = 0;
    const top = score > 0 ? saveScore(playerName, score) : loadScores();
    finalScoreEl.textContent = score;
    topScoresEl.innerHTML = "";
    if (top.length === 0) {
        topScoresEl.innerHTML = "<li>Aún no hay puntajes</li>";
    }
    top.forEach((s) => {
        const li = document.createElement("li");
        li.innerHTML = `<b></b> — ${s.score} pts<br><small>${formatDate(s.date)}</small>`;
        li.querySelector("b").textContent = s.name; // evita inyectar HTML con el nombre
        topScoresEl.appendChild(li);
    });
    updateRecordDisplay();
    gameOverModal.classList.remove("hidden");
}

restartBtn.addEventListener("click", () => {
    gameOverModal.classList.add("hidden");
    resetGame();
    state = "playing";
});

// Captura de eventos del teclado
document.addEventListener("keydown", (e) => {
    if (e.target === nameInput) return; // no mover la paleta mientras escribe

    if (e.key === "p" || e.key === "P" || e.key === " ") {
        e.preventDefault();
        togglePause();
        return;
    }
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        paddle.dy = -paddle.speed;
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        paddle.dy = paddle.speed;
    }
});
document.addEventListener("keyup", (e) => {
    if (
        e.key === "ArrowUp" || e.key === "ArrowDown" ||
        e.key === "w" || e.key === "s" || e.key === "W" || e.key === "S"
    ) {
        paddle.dy = 0;
    }
});

// Elegir un color distinto al actual
function changePaddleColor() {
    let newColor;
    do {
        newColor = PADDLE_COLORS[Math.floor(Math.random() * PADDLE_COLORS.length)];
    } while (newColor === paddle.color);
    paddle.color = newColor;
}

// Lógica de físicas y colisiones
function update() {
    // 1. Movimiento de la paleta
    paddle.y += paddle.dy;

    // Limitar la paleta para que no salga del Canvas
    if (paddle.y < 0) paddle.y = 0;
    if (paddle.y + paddle.height > canvas.height) paddle.y = canvas.height - paddle.height;

    // 2. Movimiento de la pelota
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Rebote superior e inferior
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.speedY *= -1;
    }

    // Rebote en la pared derecha (simulando el modo práctica)
    if (ball.x + ball.radius > canvas.width) {
        ball.speedX *= -1;
    }
    // 3. Colisión de la pelota con la paleta
    if (
        ball.x - ball.radius < paddle.x + paddle.width &&
        ball.x + ball.radius > paddle.x &&
        ball.y > paddle.y &&
        ball.y < paddle.y + paddle.height
    ) {
        ball.speedX *= -1;
        // Aumentar ligeramente la velocidad para dar progresión al juego
        ball.speedX += (ball.speedX > 0) ? 0.2 : -0.2;
        ball.x = paddle.x + paddle.width + ball.radius; // Evitar que la pelota se "atasque"
        score++;
        changePaddleColor();
        updateRecordDisplay();
    }
    // 4. Fin del juego si la pelota sale por la izquierda
    if (ball.x < 0) {
        gameOver();
    }
}

// Función para reiniciar el estado
function resetGame() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = 5;
    ball.speedY = 5;
    paddle.y = (canvas.height - paddle.height) / 2;
    paddle.color = PADDLE_COLORS[0];
    score = 0;
    pauseBtn.textContent = "⏸ Pausa";
    updateRecordDisplay();
}

// Dibujo de los elementos en el Canvas
function draw() {
    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar pared derecha (visual)
    ctx.fillStyle = "#555";
    ctx.fillRect(canvas.width - 10, 0, 10, canvas.height);

    // Dibujar paleta con brillo de su color
    ctx.shadowColor = paddle.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Dibujar pelota
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.closePath();

    // Dibujar marcador
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Puntos: " + score, canvas.width / 2, 40);

    // Aviso de pausa
    if (state === "paused") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "48px Arial";
        ctx.fillText("PAUSA", canvas.width / 2, canvas.height / 2);
    }
    ctx.textAlign = "left";
}

// ---------- Fondo de galaxia: estrellas que titilan ----------
const starCanvas = document.getElementById('starfield');
const starCtx = starCanvas.getContext('2d');
let stars = [];

function createStars() {
    starCanvas.width = window.innerWidth;
    starCanvas.height = window.innerHeight;
    const count = Math.floor((starCanvas.width * starCanvas.height) / 3000);
    stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * starCanvas.width,
            y: Math.random() * starCanvas.height,
            r: Math.random() * 1.5 + 0.2,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.03 + 0.005
        });
    }
}

function drawStars() {
    starCtx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    for (const s of stars) {
        s.phase += s.speed;
        const alpha = 0.4 + Math.sin(s.phase) * 0.4 + 0.2;
        starCtx.beginPath();
        starCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        starCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        starCtx.fill();
    }
}

window.addEventListener("resize", createStars);
createStars();

// Bucle de animación principal
function gameLoop() {
    if (state === "playing") {
        update();
    }
    draw();
    drawStars();
    requestAnimationFrame(gameLoop);
}

// Iniciar: cargar el último nombre usado y pedir el nombre
try { playerName = localStorage.getItem("pongPlayer") || ""; } catch { }
updateRecordDisplay();
askName();
gameLoop();
