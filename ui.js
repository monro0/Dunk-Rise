import { SKINS } from './config.js';
import { drawSkin } from './game-draw.js';
import { getTopPlayers } from './leaderboard.js';
import { isSkinLoaded } from './skin-loader.js';

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
const soundToggle = document.getElementById('soundToggle');

// Shop Elements
const shopScreen = document.getElementById('shop-screen');
const shopContainer = document.querySelector('.shop-grid');

// Leaderboard Elements
const leaderboardScreen = document.getElementById('leaderboard-screen');
const leaderboardList = document.getElementById('leaderboard-list');

let leaderboardUnsubscribe = null;

export function initUI() {
    const savedScore = localStorage.getItem('dunkRiseHighScore') || '0';
    if (highScoreElement) highScoreElement.innerText = savedScore;
    if (menuHighScore) menuHighScore.innerText = savedScore;
    const stars = parseInt(localStorage.getItem('dunkRise_stars') || '0', 10) || 0;
    updateStarsUI(stars);
}

export function updateStarsUI(stars) {
    const starsValue = document.getElementById('stars-value');
    const menuStarsEl = document.getElementById('menu-stars');
    const shopStarsEl = document.getElementById('shop-stars');
    const str = String(isNaN(stars) ? 0 : Math.max(0, stars));
    if (starsValue) starsValue.innerText = str;
    if (menuStarsEl) menuStarsEl.innerText = str;
    if (shopStarsEl) shopStarsEl.innerText = str;
}

export function showMainMenu() {
    if (mainMenu) mainMenu.classList.remove('hidden');
    if (gameHud) gameHud.classList.add('hidden');
    if (shopScreen) shopScreen.classList.add('hidden');
    
    const savedScore = localStorage.getItem('dunkRiseHighScore') || '0';
    if (menuHighScore) menuHighScore.innerText = savedScore;
    const stars = parseInt(localStorage.getItem('dunkRise_stars') || '0', 10) || 0;
    updateStarsUI(stars);
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
    // СИНХРОНИЗАЦИЯ ЗВУКА
    if (soundToggle) {
        soundToggle.checked = settings.sound;
    }
}

// --- SHOP UI ---

export function showShop(state, onSelect, onBuy) {
    if (shopScreen) {
        shopScreen.classList.remove('hidden');
        updateStarsUI(state.stars);
        renderShop(state, onSelect, onBuy);
    }
}

export function hideShop() {
    if (shopScreen) shopScreen.classList.add('hidden');
}

export function renderShop(state, onSelectCallback, onBuyCallback) {
    if (!shopContainer) return;
    
    const activeSkin = state.shop.activeSkin;
    const unlockedSkins = state.shop.unlockedSkins || [];
    const stars = state.stars || 0;

    shopContainer.innerHTML = '';

    SKINS.forEach(skin => {
        const isUnlocked = unlockedSkins.includes(skin.id);
        const isActive = skin.id === activeSkin;
        const canBuy = skin.price > 0 && !isUnlocked;

        const card = document.createElement('div');
        card.className = `shop-card ${isActive ? 'active' : ''} ${canBuy ? 'shop-card--locked' : ''}`;
        
        let touchStartX = 0;
        let touchStartY = 0;

        card.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            const distance = Math.sqrt(Math.pow(touchEndX - touchStartX, 2) + Math.pow(touchEndY - touchStartY, 2));
            if (distance < 10) {
                if (e.cancelable) e.preventDefault();
                handleCardAction();
            }
        });

        card.addEventListener('click', () => handleCardAction());

        function handleCardAction() {
            if (canBuy) {
                if (stars >= skin.price && onBuyCallback) {
                    onBuyCallback(skin.id, skin.price);
                }
                return;
            }
            if (!isActive && onSelectCallback) {
                onSelectCallback(skin.id);
            }
        }

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

        if (canBuy) {
            const priceEl = document.createElement('div');
            priceEl.className = 'shop-card-price';
            priceEl.innerHTML = `${skin.price} ⭐`;
            card.appendChild(priceEl);
        } else if (isUnlocked && skin.price > 0) {
            const owned = document.createElement('div');
            owned.className = 'shop-card-owned';
            owned.textContent = 'Есть';
            card.appendChild(owned);
        }

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

// --- LEADERBOARD UI ---

export function showLeaderboard() {
    if (leaderboardScreen) {
        leaderboardScreen.classList.remove('hidden');
        loadLeaderboard();
    }
    // Скрываем главное меню
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        mainMenu.classList.add('hidden');
    }
}

export function hideLeaderboard() {
    if (leaderboardScreen) {
        leaderboardScreen.classList.add('hidden');
    }
    // Показываем главное меню
    const mainMenu = document.getElementById('main-menu');
    if (mainMenu) {
        mainMenu.classList.remove('hidden');
    }
    // Отписываемся от обновлений
    if (leaderboardUnsubscribe) {
        leaderboardUnsubscribe();
        leaderboardUnsubscribe = null;
    }
}

function loadLeaderboard() {
    if (!leaderboardList) return;
    
    leaderboardList.innerHTML = '<div class="leaderboard-loading">Загрузка...</div>';
    
    // Загружаем топ игроков
    leaderboardUnsubscribe = getTopPlayers(20, (players) => {
        renderLeaderboard(players);
    });
}

function renderLeaderboard(players) {
    if (!leaderboardList) return;
    
    if (players.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-empty">Пока нет игроков. Стань первым!</div>';
        return;
    }
    
    const myPlayerId = localStorage.getItem('dunkRise_playerId') || '';
    const isTelegram = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe;
    let tgId = '';
    if (isTelegram) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        if (user && user.id) {
            tgId = `tg_${user.id}`;
        }
    }
    
    leaderboardList.innerHTML = players.map(player => {
        const isMyRank = player.id === myPlayerId || (tgId && player.id === tgId);
        const rankClass = player.rank <= 3 ? `rank-${player.rank}` : '';
        const myRankClass = isMyRank ? 'my-rank-row' : '';
        
        return `
            <div class="leaderboard-row ${rankClass} ${myRankClass}">
                <span class="lb-rank">${player.rank}</span>
                <span class="lb-name">${escapeHtml(player.name)}</span>
                <span class="lb-score">${player.score}</span>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
