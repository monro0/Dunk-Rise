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
let gameState = null;

// --- DOM INIT ---
const canvas = document.getElementById('gameCanvas');
const container = document.getElementById('game-container');
const ctx = canvas.getContext('2d');

// Меню
const playButton = document.getElementById('playButton');
const settingsButton = document.getElementById('settingsButton');
const shopButton = document.getElementById('shopButton');

// HUD & Shop
const homeBtn = document.getElementById('homeBtn');
const topRestartBtn = document.getElementById('topRestartBtn');
const shopBackBtn = document.getElementById('shopBackBtn');
const settingsBackBtn = document.getElementById('settingsBackBtn');

// Modals
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

// --- LOGIC: Settings ---

function loadSettings() {
    // 1. Вибрация
    const savedVib = localStorage.getItem('dunkRise_vibration');
    GameSettings.vibration = savedVib === null ? true : (savedVib === 'true');

    // 2. Звук
    const savedSound = localStorage.getItem('dunkRise_sound');
    GameSettings.sound = savedSound === null ? true : (savedSound === 'true');

    UI.syncSettingsUI(GameSettings);
}

// Функции обновления (вызываются переключателями)
function updateVibrationState(isChecked) {
    GameSettings.vibration = isChecked;
    localStorage.setItem('dunkRise_vibration', isChecked);
    
    // Тест вибрации
    if (isChecked && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
}

function updateSoundState(isChecked) {
    GameSettings.sound = isChecked;
    localStorage.setItem('dunkRise_sound', isChecked);
    
    // Тест звука
    if (isChecked) playSound('rim', 0.5);
}

// --- LOGIC: Game Over ---

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

// --- EVENTS ---

// 1. Стандартные кнопки
function addInteractionListener(element, callback) {
    if (!element) return;
    element.addEventListener('click', callback);
    element.addEventListener('touchend', (e) => {
        // Игнорируем input внутри label, чтобы не ломать чекбоксы
        if (element.tagName !== 'INPUT' && !element.disabled) {
            e.preventDefault(); 
            e.stopPropagation(); 
            callback();
        }
    }, { passive: false });
}

addInteractionListener(playButton, startGame);
addInteractionListener(settingsButton, UI.showSettings);
addInteractionListener(shopButton, openShop);
addInteractionListener(shopBackBtn, closeShop);
addInteractionListener(homeBtn, goToMenu);
addInteractionListener(topRestartBtn, performFullRestart);
addInteractionListener(restartButton, performFullRestart);
addInteractionListener(goHomeButton, goToMenu);
addInteractionListener(adButton, performRevive);
addInteractionListener(closeSecondChanceBtn, performCloseSecondChance);
addInteractionListener(settingsBackBtn, UI.hideSettings);

// 2. БЫСТРЫЕ ПЕРЕКЛЮЧАТЕЛИ (FIX DELAY)
// Эта функция вешает обработчик на весь LABEL, чтобы клик срабатывал мгновенно
function setupFastToggle(inputId, onChangeCallback) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Находим родительский label (вся кнопка)
    const label = input.closest('label');

    // Логика переключения
    const toggle = () => {
        const newState = input.checked;
        onChangeCallback(newState);
    };

    // Стандартное поведение (для ПК)
    input.addEventListener('change', toggle);

    // Мгновенное нажатие (для Телефонов)
    if (label) {
        label.addEventListener('touchend', (e) => {
            // Отменяем стандартное поведение (которое ждет 300мс)
            if (e.cancelable) e.preventDefault();
            
            // Вручную меняем состояние галочки
            input.checked = !input.checked;
            
            // Запускаем логику
            toggle();
        }, { passive: false });
        
        // Предотвращаем двойное срабатывание от клика
        label.addEventListener('click', (e) => {
            // Если событие пришло от мыши - ок, если от тача - мы его уже обработали
            // e.preventDefault() в touchend обычно достаточно
        });
    }
}

// Подключаем наши тумблеры через быструю функцию
setupFastToggle('vibrationToggle', updateVibrationState);
setupFastToggle('soundToggle', updateSoundState);


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
    initAudio();
    resize();
    UI.showMainMenu();
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

init();
