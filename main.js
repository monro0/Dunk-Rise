import * as Config from './config.js';
import * as UI from './ui.js';
import * as GameState from './game-state.js';
import * as GameUpdate from './game-update.js';
import * as GameDraw from './game-draw.js';
import * as GameInput from './game-input.js';
import { GameSettings } from './config.js';
import { initAudio, playSound } from './audio.js';

// --- Telegram bridge (опционально) ---
const tg = (() => {
    const app = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) 
        ? window.Telegram.WebApp 
        : null;
    return {
        haptic: (style = 'light') => {
            if (app && app.HapticFeedback) {
                app.HapticFeedback.impactOccurred(style);
            }
        }
    };
})();

// --- Variables ---
let lastTime = 0;
let hasUsedRevive = false;
let reviveTimerInterval = null;
let gameState = null;

// --- DOM elements ---
const canvas = document.getElementById('gameCanvas');
const container = document.getElementById('game-container');
const ctx = canvas.getContext('2d');

const playButton = document.getElementById('playButton');
const settingsButton = document.getElementById('settingsButton');
const shopButton = document.getElementById('shopButton');
const homeBtn = document.getElementById('homeBtn');
const topRestartBtn = document.getElementById('topRestartBtn');
const shopBackBtn = document.getElementById('shopBackBtn');
const settingsBackBtn = document.getElementById('settingsBackBtn');
const restartButton = document.getElementById('restartButton');
const goHomeButton = document.getElementById('goHomeButton');
const adButton = document.getElementById('adButton');
const closeSecondChanceBtn = document.getElementById('closeSecondChance');

// --- Interstitial cooldown (3 минуты) ---
const INTERSTITIAL_COOLDOWN = 180000; // 3 минуты в миллисекундах

function canShowInterstitial() {
    const lastShown = localStorage.getItem('lastInterstitialTime');
    if (!lastShown) return true;
    return (Date.now() - parseInt(lastShown)) > INTERSTITIAL_COOLDOWN;
}

function showInterstitialIfAvailable() {
    if (!window.ysdk || !canShowInterstitial()) return;
    window.ysdk.adv.showInterstitial({
        callbacks: {
            onClose: () => {
                console.log('Interstitial closed');
                localStorage.setItem('lastInterstitialTime', Date.now().toString());
            },
            onError: (e) => console.error('Interstitial error:', e)
        }
    });
}

// --- Resize ---
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

// --- Game flow ---
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

// --- Shop ---
function openShop() {
    const activeSkin = localStorage.getItem('dunkRise_activeSkin') || 'basketball';
    UI.showShop(activeSkin, (newSkinId) => {
        localStorage.setItem('dunkRise_activeSkin', newSkinId);
        if (gameState) {
            GameState.setActiveSkin(gameState, newSkinId);
        }
    });
}

function closeShop() {
    UI.hideShop();
}

// --- Settings ---
function loadSettings() {
    const savedVib = localStorage.getItem('dunkRise_vibration');
    GameSettings.vibration = savedVib === null ? true : (savedVib === 'true');
    const savedSound = localStorage.getItem('dunkRise_sound');
    GameSettings.sound = savedSound === null ? true : (savedSound === 'true');
    UI.syncSettingsUI(GameSettings);
}

function updateVibrationState(isChecked) {
    GameSettings.vibration = isChecked;
    localStorage.setItem('dunkRise_vibration', isChecked);
    if (isChecked) tg.haptic('light');
}

function updateSoundState(isChecked) {
    GameSettings.sound = isChecked;
    localStorage.setItem('dunkRise_sound', isChecked);
    if (isChecked) playSound('rim', 0.5);
}

// --- Game Over & Second Chance ---
function onDeath(finalScore) {
    playSound('over', 0.8);
    if (!hasUsedRevive) {
        showSecondChanceScreenWithTimer();
    } else {
        showFinalGameOver(finalScore);
    }
}

function showSecondChanceScreenWithTimer() {
    let timeLeft = 5;
    UI.showSecondChanceScreen(timeLeft);
    
    // Запускаем таймер
    const interval = setInterval(() => {
        timeLeft--;
        UI.updateSecondChanceTimer(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(interval);
            UI.hideSecondChanceScreen();
            if (gameState && gameState.isGameOver) {
                showFinalGameOver(gameState.score);
            }
        }
    }, 1000);
    
    reviveTimerInterval = interval;
}

function performRevive() {
    clearInterval(reviveTimerInterval);
    UI.hideSecondChanceScreen();
    hasUsedRevive = true;
    if (gameState) {
        GameState.reviveGameLogic(gameState);
    }
}

function performCloseSecondChance() {
    clearInterval(reviveTimerInterval);
    if (gameState) {
        UI.hideSecondChanceScreen();
        showFinalGameOver(gameState.score);
    }
}

function showFinalGameOver(finalScore) {
    const currentHigh = parseInt(localStorage.getItem('dunkRiseHighScore') || '0');
    const isRecord = finalScore > currentHigh;
    UI.showGameOverScreen(finalScore, isRecord);
}

function performFullRestart() {
    UI.hideGameOverScreen();
    UI.hideSecondChanceScreen();
    hasUsedRevive = false;
    clearInterval(reviveTimerInterval);
    gameState = GameState.createInitialState(container.clientWidth, container.clientHeight);
    UI.updateScoreUI(0);
}

// --- Callbacks for game logic ---
const logicCallbacks = {
    onScore: (newScore) => {
        UI.updateScoreUI(newScore);
        const currentHigh = parseInt(localStorage.getItem('dunkRiseHighScore') || '0');
        if (newScore > currentHigh) {
            localStorage.setItem('dunkRiseHighScore', newScore);
            UI.updateHighScoreUI(newScore);
        }
    },
    onBallFellBack: () => {
        playSound('bounce', 0.5);
    },
    onDeath: onDeath,
    onHaptic: (style) => {
        if (!GameSettings.vibration) return;
        tg.haptic(style);
    }
};

// --- Event listeners ---
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

addInteractionListener(playButton, startGame);
addInteractionListener(settingsButton, UI.showSettings);
addInteractionListener(shopButton, openShop);
addInteractionListener(shopBackBtn, closeShop);
addInteractionListener(homeBtn, goToMenu);
addInteractionListener(topRestartBtn, performFullRestart);
addInteractionListener(restartButton, () => {
    showInterstitialIfAvailable();
    performFullRestart();
});
addInteractionListener(goHomeButton, () => {
    showInterstitialIfAvailable();
    goToMenu();
});
addInteractionListener(closeSecondChanceBtn, performCloseSecondChance);

// Обработчик кнопки "Второй шанс" – показывает рекламу
addInteractionListener(adButton, () => {
    // Если SDK нет (например, локально) – просто ревайв для теста
    if (!window.ysdk) {
        performRevive();
        return;
    }

    // Показываем индикатор загрузки
    adButton.innerHTML = 'Загрузка...';
    adButton.disabled = true;

    window.ysdk.adv.showRewardedVideo({
        callbacks: {
            onOpen: () => console.log('Rewarded video opened'),
            onRewarded: () => {
                console.log('Rewarded!');
                adButton.innerHTML = '📺 Второй шанс';
                adButton.disabled = false;
                performRevive();
            },
            onClose: () => {
                console.log('Rewarded video closed');
                adButton.innerHTML = '📺 Второй шанс';
                adButton.disabled = false;
                // Если игрок закрыл видео без награды, показываем Game Over
                if (gameState && gameState.isGameOver) {
                    UI.hideSecondChanceScreen();
                    showFinalGameOver(gameState.score);
                }
            },
            onError: (error) => {
                console.error('Rewarded video error:', error);
                adButton.innerHTML = '📺 Второй шанс';
                adButton.disabled = false;
                if (gameState && gameState.isGameOver) {
                    UI.hideSecondChanceScreen();
                    showFinalGameOver(gameState.score);
                }
            }
        }
    });
});

// Быстрые переключатели
function setupFastToggle(inputId, onChangeCallback) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const label = input.closest('label');
    const toggle = () => onChangeCallback(input.checked);
    input.addEventListener('change', toggle);
    if (label) {
        label.addEventListener('touchend', (e) => {
            if (e.cancelable) e.preventDefault();
            input.checked = !input.checked;
            toggle();
        }, { passive: false });
    }
}

setupFastToggle('vibrationToggle', updateVibrationState);
setupFastToggle('soundToggle', updateSoundState);

// --- Input handling (drag) ---
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener('mousedown', (e) => { if(gameState) GameInput.handleStartDrag(getPos(e), gameState); });
window.addEventListener('mousemove', (e) => { if(gameState) GameInput.handleMoveDrag(getPos(e), gameState); });
window.addEventListener('mouseup', () => { if(gameState) GameInput.handleEndDrag(gameState); });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if(gameState) GameInput.handleStartDrag(getPos(e), gameState); });
window.addEventListener('touchmove', (e) => { e.preventDefault(); if(gameState) GameInput.handleMoveDrag(getPos(e), gameState); });
window.addEventListener('touchend', (e) => { e.preventDefault(); if(gameState) GameInput.handleEndDrag(gameState); }, {passive: false});
window.addEventListener('resize', resize);
window.addEventListener('contextmenu', e => e.preventDefault());

// --- Game loop ---
function loop(timestamp) {
    const dt = (timestamp - lastTime) / 16.67;
    lastTime = timestamp;

    if (gameState && !gameState.isGameOver) GameUpdate.updateGame(dt, gameState, logicCallbacks);
    if (gameState) GameDraw.drawGame(ctx, gameState);
    
    requestAnimationFrame(loop);
}

// --- Init with Yandex SDK ---
function initGameWithoutAds() {
    UI.initUI();
    Config.initializeConfig(canvas);
    loadSettings();
    initAudio();
    resize();
    UI.showMainMenu();
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

window.addEventListener('load', () => {
    if (typeof YaGames !== 'undefined') {
        YaGames.init()
            .then(ysdk => {
                console.log('Yandex SDK is ready');
                window.ysdk = ysdk;
                initGameWithoutAds();
            })
            .catch(error => {
                console.error('Yandex SDK init error:', error);
                initGameWithoutAds();
            });
    } else {
        console.warn('YaGames is not defined, running without ads');
        initGameWithoutAds();
    }
});