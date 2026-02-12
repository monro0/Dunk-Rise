import * as Config from './config.js';
import * as UI from './ui.js';
import * as GameState from './game-state.js';
import * as GameUpdate from './game-update.js';
import * as GameDraw from './game-draw.js';
import * as GameInput from './game-input.js';
import { GameSettings } from './config.js';
import { initAudio, playSound } from './audio.js';

let lastTime = 0;
let hasUsedRevive = false;
let reviveTimerInterval = null;

// Главный объект состояния игры
let gameState = null;

// --- DOM INIT ---
const canvas = document.getElementById('gameCanvas');
const container = document.getElementById('game-container');
const ctx = canvas.getContext('2d');

// Меню
const playButton = document.getElementById('playButton');
const settingsButton = document.getElementById('settingsButton');
const shopButton = document.getElementById('shopButton');

// HUD
const homeBtn = document.getElementById('homeBtn');
const topRestartBtn = document.getElementById('topRestartBtn');

// Настройки
const settingsBackBtn = document.getElementById('settingsBackBtn');
const vibrationToggle = document.getElementById('vibrationToggle');
const soundToggle = document.getElementById('soundToggle'); // <--- НОВАЯ КНОПКА

// Магазин
const shopBackBtn = document.getElementById('shopBackBtn');

// Модалки
const restartButton = document.getElementById('restartButton');
const goHomeButton = document.getElementById('goHomeButton');
const adButton = document.getElementById('adButton');
const closeSecondChanceBtn = document.getElementById('closeSecondChance');


function resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    if (gameState) {
        gameState.width = width;
        gameState.height = height;
    }
}

// --- LOGIC: Game Flow ---

function startGame() {
    UI.hideMainMenu();
    performFullRestart();
}

function goToMenu() {
    gameState = null;
    UI.hideGameOverScreen();
    UI.hideSecondChanceScreen();
    clearInterval(reviveTimerInterval);
    hasUsedRevive = false;
    UI.showMainMenu();
}

// --- LOGIC: Shop ---

function openShop() {
    const activeSkin = localStorage.getItem('dunkRise_activeSkin') || 'basketball';
    UI.showShop(activeSkin, (newSkinId) => {
        localStorage.setItem('dunkRise_activeSkin', newSkinId);
    });
}

function closeShop() {
    UI.hideShop();
}

// --- LOGIC: Settings (Sound & Vibration) ---

function loadSettings() {
    // 1. Вибрация
    const savedVib = localStorage.getItem('dunkRise_vibration');
    if (savedVib !== null) {
        GameSettings.vibration = (savedVib === 'true');
    } else {
        GameSettings.vibration = true; 
    }

    // 2. Звук
    const savedSound = localStorage.getItem('dunkRise_sound');
    if (savedSound !== null) {
        GameSettings.sound = (savedSound === 'true');
    } else {
        GameSettings.sound = true; 
    }

    UI.syncSettingsUI(GameSettings);
}

function toggleVibration(e) {
    // Получаем состояние из чекбокса (e.target может быть undefined при ручном вызове, берем сам элемент)
    const checkbox = e.target || vibrationToggle;
    const isChecked = checkbox.checked;
    
    GameSettings.vibration = isChecked;
    localStorage.setItem('dunkRise_vibration', isChecked);
    
    // Тестовая вибрация при включении
    if (isChecked && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
}

function toggleSound(e) {
    const checkbox = e.target || soundToggle;
    const isChecked = checkbox.checked;
    
    GameSettings.sound = isChecked;
    localStorage.setItem('dunkRise_sound', isChecked);
    
    // Тестовый звук при включении
    if (isChecked) playSound('rim', 0.5);
}

// --- LOGIC: Game Over Flow ---

function onDeath(finalScore) {
    playSound('over', 0.8);
    if (!hasUsedRevive) {
        triggerSecondChance();
    } else {
        showFinalGameOver(finalScore);
    }
}

function triggerSecondChance() {
    let timeLeft = 5;
    UI.showSecondChanceScreen(timeLeft);
    reviveTimerInterval = setInterval(() => {
        timeLeft--;
        UI.updateSecondChanceTimer(timeLeft);
        if (timeLeft <= 0) {
            performCloseSecondChance();
        }
    }, 1000);
}

function performCloseSecondChance() {
    clearInterval(reviveTimerInterval);
    if (gameState) {
        showFinalGameOver(gameState.score);
    }
}

function showFinalGameOver(finalScore) {
    const currentHigh = parseInt(localStorage.getItem('dunkRiseHighScore') || '0');
    const isRecord = finalScore > currentHigh;
    UI.showGameOverScreen(finalScore, isRecord);
}

function performRevive() {
    clearInterval(reviveTimerInterval);
    setTimeout(() => {
        UI.hideSecondChanceScreen();
        hasUsedRevive = true;
        if (gameState) {
            GameState.reviveGameLogic(gameState);
        }
    }, 500);
}

function performFullRestart() {
    UI.hideGameOverScreen();
    UI.hideSecondChanceScreen();
    hasUsedRevive = false;
    clearInterval(reviveTimerInterval);
    gameState = GameState.createInitialState(container.clientWidth, container.clientHeight);
    UI.updateScoreUI(0);
}

// --- CALLBACKS ---
const logicCallbacks = {
    onScore: (newScore) => {
        UI.updateScoreUI(newScore);
        const currentHigh = parseInt(localStorage.getItem('dunkRiseHighScore') || '0');
        if (newScore > currentHigh) {
            localStorage.setItem('dunkRiseHighScore', newScore);
            UI.updateHighScoreUI(newScore);
        }
    },
    onDeath: onDeath,
    onHaptic: (style) => {
        if (!GameSettings.vibration) return;
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
        }
    }
};

// --- EVENTS (Button Wrappers) ---
function addInteractionListener(element, callback) {
    if (!element) return;
    element.addEventListener('click', callback);
    element.addEventListener('touchend', (e) => {
        if (element.tagName !== 'INPUT' && !element.disabled) {
            e.preventDefault(); 
            e.stopPropagation(); 
            callback();
        }
    }, { passive: false });
}

// Main Menu
addInteractionListener(playButton, startGame);
addInteractionListener(settingsButton, UI.showSettings);
addInteractionListener(shopButton, openShop);

// Shop & HUD
addInteractionListener(shopBackBtn, closeShop);
addInteractionListener(homeBtn, goToMenu);
addInteractionListener(topRestartBtn, performFullRestart);

// Game Over & Modals
addInteractionListener(restartButton, performFullRestart);
addInteractionListener(goHomeButton, goToMenu);
addInteractionListener(adButton, performRevive);
addInteractionListener(closeSecondChanceBtn, performCloseSecondChance);

// --- SETTINGS EVENTS (INSTANT TOGGLE FIX) ---
// Кнопка назад работает стандартно
addInteractionListener(settingsBackBtn, UI.hideSettings);

// Тумблер Вибрации (Без задержек)
if (vibrationToggle) {
    vibrationToggle.addEventListener('click', toggleVibration); // Для ПК
    vibrationToggle.addEventListener('touchend', (e) => {
        e.preventDefault(); // Отменяем ожидание дабл-тапа и зум
        vibrationToggle.checked = !vibrationToggle.checked; // Меняем галочку вручную
        toggleVibration({ target: vibrationToggle }); // Вызываем логику
    }, { passive: false });
}

// Тумблер Звука (Без задержек)
if (soundToggle) {
    soundToggle.addEventListener('click', toggleSound); // Для ПК
    soundToggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        soundToggle.checked = !soundToggle.checked;
        toggleSound({ target: soundToggle });
    }, { passive: false });
}


// --- INPUT HANDLING ---
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener('mousedown', (e) => { if(gameState) GameInput.handleStartDrag(getPos(e), gameState); });
window.addEventListener('mousemove', (e) => { if(gameState) GameInput.handleMoveDrag(getPos(e), gameState); });
window.addEventListener('mouseup', () => { if(gameState) GameInput.handleEndDrag(gameState); });

// Touch Events (Passive: false для предотвращения скролла игры)
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if(gameState) GameInput.handleStartDrag(getPos(e), gameState); }, {passive: false});
window.addEventListener('touchmove', (e) => { e.preventDefault(); if(gameState) GameInput.handleMoveDrag(getPos(e), gameState); }, {passive: false});
window.addEventListener('touchend', (e) => { e.preventDefault(); if(gameState) GameInput.handleEndDrag(gameState); }, {passive: false});
window.addEventListener('resize', resize);

// --- INIT ---
function loop(timestamp) {
    const dt = (timestamp - lastTime) / 16.67;
    lastTime = timestamp;
    if (gameState && !gameState.isGameOver) GameUpdate.updateGame(dt, gameState, logicCallbacks);
    if (gameState) GameDraw.drawGame(ctx, gameState);
    requestAnimationFrame(loop);
}

function init() {
    UI.initUI();
    Config.initializeConfig(canvas);
    loadSettings();
    initAudio(); // Загрузка звуков
    resize();
    UI.showMainMenu();
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

init();
