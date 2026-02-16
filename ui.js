import { SKINS } from './config.js';
import { drawSkin } from './game-draw.js';

// --- UI MANAGER ---
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score-value');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const secondChanceScreen = document.getElementById('secondChanceScreen');
const secondChanceTimerEl = document.getElementById('secondChanceTimer');

const mainMenu = document.getElementById('main-menu');
const menuHighScore = document.getElementById('menu-high-score');
const gameHud = document.getElementById('game-hud');

const settingsScreen = document.getElementById('settings-screen');
const vibrationToggle = document.getElementById('vibrationToggle');
const soundToggle = document.getElementById('soundToggle');

const shopScreen = document.getElementById('shop-screen');
const shopContainer = document.querySelector('.shop-grid');

export function initUI() {
    const savedScore = localStorage.getItem('dunkRiseHighScore') || '0';
    if (highScoreElement) highScoreElement.innerText = savedScore;
    if (menuHighScore) menuHighScore.innerText = savedScore;
}

export function showMainMenu() {
    if (mainMenu) mainMenu.classList.remove('hidden');
    if (gameHud) gameHud.classList.add('hidden');
    if (shopScreen) shopScreen.classList.add('hidden');
    const savedScore = localStorage.getItem('dunkRiseHighScore') || '0';
    if (menuHighScore) menuHighScore.innerText = savedScore;
}

export function hideMainMenu() {
    if (mainMenu) mainMenu.classList.add('hidden');
    if (gameHud) gameHud.classList.remove('hidden');
}

// --- SETTINGS ---
export function showSettings() {
    if (settingsScreen) settingsScreen.classList.remove('hidden');
}

export function hideSettings() {
    if (settingsScreen) settingsScreen.classList.add('hidden');
}

export function syncSettingsUI(settings) {
    if (vibrationToggle) vibrationToggle.checked = settings.vibration;
    if (soundToggle) soundToggle.checked = settings.sound;
}

// --- SHOP ---
export function showShop(activeSkin, onSelect) {
    if (shopScreen) {
        shopScreen.classList.remove('hidden');
        renderShop(activeSkin, onSelect);
    }
}

export function hideShop() {
    if (shopScreen) shopScreen.classList.add('hidden');
}

function renderShop(activeSkin, onSelectCallback) {
    if (!shopContainer) return;
    shopContainer.innerHTML = '';

    SKINS.forEach(skin => {
        const card = document.createElement('div');
        const isActive = skin.id === activeSkin;
        card.className = `shop-card ${isActive ? 'active' : ''}`;

        let touchStartX = 0, touchStartY = 0;
        card.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const distance = Math.hypot(touchEndX - touchStartX, touchEndY - touchStartY);
            if (distance < 10) {
                if (e.cancelable) e.preventDefault();
                if (!isActive) {
                    onSelectCallback(skin.id);
                    renderShop(skin.id, onSelectCallback);
                }
            }
        });

        card.addEventListener('click', (e) => {
            if (!isActive) {
                onSelectCallback(skin.id);
                renderShop(skin.id, onSelectCallback);
            }
        });

        const title = document.createElement('div');
        title.className = 'shop-card-title';
        title.innerText = skin.name;

        const canvas = document.createElement('canvas');
        canvas.className = 'skin-canvas';
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        drawSkin(ctx, 50, 50, 35, 0, skin.id);

        card.appendChild(title);
        card.appendChild(canvas);
        shopContainer.appendChild(card);
    });
}

// --- HUD ---
export function updateScoreUI(score) {
    if (scoreElement) scoreElement.innerText = score;
}

export function updateHighScoreUI(score) {
    if (highScoreElement) highScoreElement.innerText = score;
    if (menuHighScore) menuHighScore.innerText = score;
}

// --- SECOND CHANCE ---
export function showSecondChanceScreen(timeLeft) {
    secondChanceScreen.classList.remove('hidden');
    if (secondChanceTimerEl) secondChanceTimerEl.innerText = timeLeft;
}

export function updateSecondChanceTimer(timeLeft) {
    if (secondChanceTimerEl) secondChanceTimerEl.innerText = timeLeft;
}

export function hideSecondChanceScreen() {
    secondChanceScreen.classList.add('hidden');
}

// --- GAME OVER ---
export function showGameOverScreen(score, isNewRecord) {
    gameOverScreen.classList.remove('hidden');
    hideSecondChanceScreen();
    if (finalScoreElement) finalScoreElement.innerText = `Счёт: ${score}`;
}

export function hideGameOverScreen() {
    gameOverScreen.classList.add('hidden');
}

// --- AD LOADING INDICATOR (используется в main.js) ---
export function showAdLoading() {
    const adButton = document.getElementById('adButton');
    if (adButton) {
        adButton.textContent = 'Загрузка...';
        adButton.disabled = true;
    }
}

export function hideAdLoading() {
    const adButton = document.getElementById('adButton');
    if (adButton) {
        adButton.textContent = '📺 Второй шанс';
        adButton.disabled = false;
    }
}