import * as Config from './config.js';
import * as UI from './ui.js';
import * as GameState from './game-state.js';
import * as GameUpdate from './game-update.js';
import * as GameDraw from './game-draw.js';
import * as GameInput from './game-input.js';

let lastTime = 0;
let hasUsedRevive = false;
let reviveTimerInterval = null;

// Главный объект состояния игры
let gameState = null;

// --- DOM INIT ---
const canvas = document.getElementById('gameCanvas');
const container = document.getElementById('game-container');
const ctx = canvas.getContext('2d');

// Кнопки
const playButton = document.getElementById('playButton');
const homeBtn = document.getElementById('homeBtn');
const restartButton = document.getElementById('restartButton');
const topRestartBtn = document.getElementById('topRestartBtn');
const adButton = document.getElementById('adButton');
const closeSecondChanceBtn = document.getElementById('closeSecondChance');
const menuButtonOver = document.getElementById('menuButtonOver');

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

// --- LOGIC: Game Flow Management ---

function startGame() {
    UI.hideMainMenu();
    performFullRestart();
}

function goToMenu() {
    // Останавливаем текущую игру
    gameState = null;
    UI.hideGameOverScreen();
    UI.hideSecondChanceScreen();
    clearInterval(reviveTimerInterval);
    hasUsedRevive = false;
    
    // Показываем меню
    UI.showMainMenu();
    
    // Очищаем канвас (опционально, можно оставить застывший кадр для фона)
    // ctx.clearRect(0, 0, canvas.width, canvas.height); 
}

function onDeath(finalScore) {
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
    console.log("Showing Ad...");
    
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

// --- CALLBACKS FOR LOGIC ---
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
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
        }
    }
};

// --- UNIVERSAL EVENT LISTENER ---
function addInteractionListener(element, callback) {
    if (!element) return;
    element.addEventListener('click', callback);
    element.addEventListener('touchend', (e) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        callback();
    }, { passive: false });
}

addInteractionListener(playButton, startGame);
addInteractionListener(homeBtn, goToMenu);
addInteractionListener(restartButton, performFullRestart);
addInteractionListener(topRestartBtn, performFullRestart);
addInteractionListener(adButton, performRevive);
addInteractionListener(closeSecondChanceBtn, performCloseSecondChance);
addInteractionListener(menuButtonOver, goToMenu); // Кнопка "Меню" на экране проигрыша


// --- GAME INPUT HANDLING (Canvas) ---

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener('mousedown', (e) => { 
    if(gameState) GameInput.handleStartDrag(getPos(e), gameState); 
});
window.addEventListener('mousemove', (e) => { 
    if(gameState) GameInput.handleMoveDrag(getPos(e), gameState); 
});
window.addEventListener('mouseup', () => { 
    if(gameState) GameInput.handleEndDrag(gameState); 
});

canvas.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    if(gameState) GameInput.handleStartDrag(getPos(e), gameState); 
}, {passive: false});

window.addEventListener('touchmove', (e) => { 
    e.preventDefault(); 
    if(gameState) GameInput.handleMoveDrag(getPos(e), gameState); 
}, {passive: false});

window.addEventListener('touchend', (e) => { 
    e.preventDefault();
    if(gameState) GameInput.handleEndDrag(gameState); 
}, {passive: false});

window.addEventListener('resize', resize);

// --- MAIN LOOP ---

function loop(timestamp) {
    const dt = (timestamp - lastTime) / 16.67;
    lastTime = timestamp;

    if (gameState && !gameState.isGameOver) {
        GameUpdate.updateGame(dt, gameState, logicCallbacks);
    }
    
    // Рисуем только если игра активна. 
    // Если gameState == null (мы в меню), можно рисовать фон или ничего.
    if (gameState) {
        GameDraw.drawGame(ctx, gameState);
    }
    
    requestAnimationFrame(loop);
}

// --- INITIALIZATION ---

function init() {
    UI.initUI();
    Config.initializeConfig(canvas);
    
    resize();
    
    // Вместо создания игры сразу, показываем меню
    UI.showMainMenu();
    
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

init();
