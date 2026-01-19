// --- UI MANAGER (Pure View) ---

const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score-value');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const secondChanceScreen = document.getElementById('secondChanceScreen');
const secondChanceTimerEl = document.getElementById('secondChanceTimer');

export function initUI() {
    const savedScore = localStorage.getItem('dunkRiseHighScore');
    if (savedScore && highScoreElement) {
        highScoreElement.innerText = savedScore;
    }
}

export function updateScoreUI(score) {
    if (scoreElement) scoreElement.innerText = score;
}

export function updateHighScoreUI(score) {
    if (highScoreElement) highScoreElement.innerText = score;
}

export function showSecondChanceScreen(timeLeft) {
    secondChanceScreen.classList.remove('hidden');
    if(secondChanceTimerEl) secondChanceTimerEl.innerText = timeLeft;
}

export function updateSecondChanceTimer(timeLeft) {
    if(secondChanceTimerEl) secondChanceTimerEl.innerText = timeLeft;
}

export function hideSecondChanceScreen() {
    secondChanceScreen.classList.add('hidden');
}

export function showGameOverScreen(score, isNewRecord) {
    gameOverScreen.classList.remove('hidden');
    hideSecondChanceScreen();
    
    if (finalScoreElement) finalScoreElement.innerText = `Счёт: ${score}`;
}

export function hideGameOverScreen() {
    gameOverScreen.classList.add('hidden');
}
