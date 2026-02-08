import { SKINS } from './config.js';
import { drawSkin } from './game-draw.js';

// --- UI MANAGER (Pure View) ---

const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score-value');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const secondChanceScreen = document.getElementById('secondChanceScreen');
const secondChanceTimerEl = document.getElementById('secondChanceTimer');

// Menu Elements
const mainMenu = document.getElementById('main-menu');
const menuHighScore = document.getElementById('menu-high-score');
const gameHud = document.getElementById('game-hud');

// Settings Elements
const settingsScreen = document.getElementById('settings-screen');
const vibrationToggle = document.getElementById('vibrationToggle');

// Shop Elements
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

// --- SETTINGS UI ---

export function showSettings() {
    if (settingsScreen) settingsScreen.classList.remove('hidden');
}

export function hideSettings() {
    if (settingsScreen) settingsScreen.classList.add('hidden');
}

export function syncSettingsUI(settings) {
    if (vibrationToggle) {
        vibrationToggle.checked = settings.vibration;
    }
}

// --- SHOP UI ---

export function showShop(activeSkin, onSelect) {
    if (shopScreen) {
        shopScreen.classList.remove('hidden');
        renderShop(activeSkin, onSelect);
    }
}

export function hideShop() {
    if (shopScreen) shopScreen.classList.add('hidden');
}

export function renderShop(activeSkin, onSelectCallback) {
    if (!shopContainer) return;
    
    shopContainer.innerHTML = ''; // Clear previous

    SKINS.forEach(skin => {
        // Создаем карточку
        const card = document.createElement('div');
        const isActive = skin.id === activeSkin;
        card.className = `shop-card ${isActive ? 'active' : ''}`;
        
        // --- FAST TAP LOGIC IMPLEMENTATION ---
        
        let touchStartX = 0;
        let touchStartY = 0;

        // 1. Touch Start: Запоминаем начальные координаты
        // passive: true улучшает производительность скролла
        card.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        // 2. Touch End: Проверяем, был ли это тап или скролл
        card.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            // Вычисляем расстояние, которое прошел палец
            const distance = Math.sqrt(Math.pow(touchEndX - touchStartX, 2) + Math.pow(touchEndY - touchStartY, 2));

            // Если палец сдвинулся меньше чем на 10px, считаем это кликом
            if (distance < 10) {
                // Предотвращаем генерацию mouse-событий (click), чтобы избежать дублирования
                if (e.cancelable) e.preventDefault();

                if (!isActive) {
                    onSelectCallback(skin.id);
                    renderShop(skin.id, onSelectCallback);
                }
            }
        });

        // 3. Click: Фоллбэк для Desktop (мышь)
        // На мобильных не сработает, если в touchend вызван preventDefault
        card.addEventListener('click', (e) => {
            if (!isActive) {
                onSelectCallback(skin.id);
                renderShop(skin.id, onSelectCallback);
            }
        });

        // -------------------------------------

        // Название
        const title = document.createElement('div');
        title.className = 'shop-card-title';
        title.innerText = skin.name;

        // Canvas Preview
        const canvas = document.createElement('canvas');
        canvas.className = 'skin-canvas';
        canvas.width = 100;
        canvas.height = 100;
        
        const ctx = canvas.getContext('2d');
        // Центр (50,50), Радиус 35px
        drawSkin(ctx, 50, 50, 35, 0, skin.id);

        card.appendChild(title);
        card.appendChild(canvas);
        
        shopContainer.appendChild(card);
    });
}


// -------------------

export function updateScoreUI(score) {
    if (scoreElement) scoreElement.innerText = score;
}

export function updateHighScoreUI(score) {
    if (highScoreElement) highScoreElement.innerText = score;
    if (menuHighScore) menuHighScore.innerText = score;
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
