import { SKINS, CASE_SKINS, CASE_COST } from './config.js';
import { drawSkin } from './game-draw.js';
import { getTopPlayers, getTotalPlayers } from './leaderboard.js';
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
const tabSkins = document.getElementById('tabSkins');
const tabCase = document.getElementById('tabCase');
const shopSkinsContent = document.getElementById('shopSkinsContent');
const shopCaseContent = document.getElementById('shopCaseContent');
const caseReelStrip = document.getElementById('caseReelStrip');
const caseOpenBtn = document.getElementById('caseOpenBtn');
const caseOwnedGrid = document.getElementById('caseOwnedGrid');
const caseResultPopup = document.getElementById('caseResultPopup');
const caseResultRarity = document.getElementById('caseResultRarity');
const caseResultCanvas = document.getElementById('caseResultCanvas');
const caseResultName = document.getElementById('caseResultName');
const caseResultBonus = document.getElementById('caseResultBonus');
const caseResultCloseBtn = document.getElementById('caseResultCloseBtn');

let caseIsSpinning = false;

// Универсальный обработчик касания/клика без задержки
function _addTap(element, callback) {
    let sx = 0, sy = 0;
    element.addEventListener('touchstart', e => {
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
    }, { passive: true });
    element.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
            if (e.cancelable) e.preventDefault();
            callback();
        }
    }, { passive: false });
    element.addEventListener('click', callback);
}

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

let playersUnsubscribe = null;

export function showSettings() {
    if (settingsScreen) settingsScreen.classList.remove('hidden');
    // Загружаем статистику игроков
    loadPlayerStats();
}

export function hideSettings() {
    if (settingsScreen) settingsScreen.classList.add('hidden');
    // Отписываемся от обновлений
    if (playersUnsubscribe) {
        playersUnsubscribe();
        playersUnsubscribe = null;
    }
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

function loadPlayerStats() {
    const totalPlayersEl = document.getElementById('totalPlayers');
    if (!totalPlayersEl) return;

    playersUnsubscribe = getTotalPlayers((count) => {
        totalPlayersEl.innerText = count.toLocaleString('ru-RU');
    });
}

// --- SHOP UI ---

export function showShop(state, onSelect, onBuy, onCaseOpen) {
    if (!shopScreen) return;
    shopScreen.classList.remove('hidden');
    updateStarsUI(state.stars);
    renderShop(state, onSelect, onBuy);
    renderCaseTab(state, onSelect, onCaseOpen);
    _initShopTabs(state, onSelect, onBuy, onCaseOpen);
    // Всегда начинаем на вкладке Скины
    _switchTab('skins');
}

export function hideShop() {
    if (shopScreen) shopScreen.classList.add('hidden');
}

function _switchTab(tab) {
    if (tab === 'skins') {
        tabSkins && tabSkins.classList.add('shop-tab--active');
        tabCase && tabCase.classList.remove('shop-tab--active');
        shopSkinsContent && shopSkinsContent.classList.remove('hidden');
        shopCaseContent && shopCaseContent.classList.add('hidden');
    } else {
        tabCase && tabCase.classList.add('shop-tab--active');
        tabSkins && tabSkins.classList.remove('shop-tab--active');
        shopCaseContent && shopCaseContent.classList.remove('hidden');
        shopSkinsContent && shopSkinsContent.classList.add('hidden');
    }
}

function _initShopTabs(state, onSelect, onBuy, onCaseOpen) {
    if (!tabSkins || !tabCase) return;
    // Клонируем, чтобы убрать старые listener'ы
    const newTabSkins = tabSkins.cloneNode(true);
    const newTabCase  = tabCase.cloneNode(true);
    tabSkins.parentNode.replaceChild(newTabSkins, tabSkins);
    tabCase.parentNode.replaceChild(newTabCase, tabCase);
    // Переназначаем ссылки в замыкании
    _addTap(newTabSkins, () => _switchTab('skins'));
    _addTap(newTabCase, () => _switchTab('case'));
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

        _addTap(card, handleCardAction);

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


// --- CASE TAB ---

export function renderCaseTab(state, onSelectCallback, onCaseOpenCallback) {
    if (!caseOwnedGrid || !caseOpenBtn) return;
    const caseUnlocked = state.shop.caseUnlockedSkins || [];
    const activeSkin = state.shop.activeSkin;

    // Отрисовываем выбитые скины
    caseOwnedGrid.innerHTML = '';
    caseUnlocked.forEach(skinId => {
        const skin = CASE_SKINS.find(s => s.id === skinId);
        if (!skin) return;
        const card = document.createElement('div');
        card.className = 'case-owned-card' + (skinId === activeSkin ? ' case-owned-card--active' : '');
        const cv = document.createElement('canvas');
        cv.width = 52; cv.height = 52;
        drawSkin(cv.getContext('2d'), 26, 26, 20, 0, skinId);
        card.appendChild(cv);
        _addTap(card, () => {
            if (onSelectCallback) onSelectCallback(skinId);
            renderCaseTab(state, onSelectCallback, onCaseOpenCallback);
        });
        caseOwnedGrid.appendChild(card);
    });

    // Кнопка открыть
    const newBtn = caseOpenBtn.cloneNode(true);
    caseOpenBtn.parentNode.replaceChild(newBtn, caseOpenBtn);
    newBtn.disabled = caseIsSpinning || state.stars < CASE_COST;
    newBtn.textContent = `КРУТИТЬ ЗА ${CASE_COST} ⭐`;

    _addTap(newBtn, () => {
        if (caseIsSpinning) return;
        if (state.stars < CASE_COST) {
            newBtn.classList.add('btn-case-open--shake');
            newBtn.addEventListener('animationend', () => newBtn.classList.remove('btn-case-open--shake'), { once: true });
            return;
        }
        if (onCaseOpenCallback) onCaseOpenCallback();
    });
}

// Слот-машина
export function animateCaseReel(winner, onDone) {
    if (!caseReelStrip) return;
    caseIsSpinning = true;

    const CARD_W = 80;
    const GAP = 8;
    const STEP = CARD_W + GAP;
    const TOTAL_CARDS = 52;
    const WINNER_IDX = 44; // позиция победителя

    // Генерируем набор карточек: случайные + победитель на WINNER_IDX
    const reelSkins = [];
    for (let i = 0; i < TOTAL_CARDS; i++) {
        if (i === WINNER_IDX) {
            reelSkins.push(winner);
        } else {
            reelSkins.push(CASE_SKINS[Math.floor(Math.random() * CASE_SKINS.length)]);
        }
    }

    // Строим DOM ленты
    caseReelStrip.innerHTML = '';
    reelSkins.forEach(skin => {
        const card = document.createElement('div');
        card.className = 'case-reel-card';
        card.style.borderColor = skin.rarity.color + '88';
        card.style.background = skin.rarity.color + '28';
        const cv = document.createElement('canvas');
        cv.width = 72; cv.height = 72;
        drawSkin(cv.getContext('2d'), 36, 36, 30, 0, skin.id);
        card.appendChild(cv);
        caseReelStrip.appendChild(card);
    });

    // Вычисляем смещение: победитель должен оказаться по центру вьюпорта
    const viewport = caseReelStrip.parentElement;
    const viewportW = viewport.offsetWidth;
    const centerOffset = Math.floor(viewportW / 2) - Math.floor(CARD_W / 2);
    const targetX = -(WINNER_IDX * STEP - centerOffset);

    // Easing: быстрый старт → плавное торможение
    const DURATION = 3800;
    let startTime = null;
    caseReelStrip.style.transform = 'translateX(0px)';

    function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

    function animate(ts) {
        if (!startTime) startTime = ts;
        const elapsed = ts - startTime;
        const progress = Math.min(elapsed / DURATION, 1);
        const eased = easeOutQuint(progress);
        const currentX = targetX * eased;
        caseReelStrip.style.transform = `translateX(${currentX}px)`;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            caseReelStrip.style.transform = `translateX(${targetX}px)`;
            // Подсвечиваем победителя
            const winCard = caseReelStrip.children[WINNER_IDX];
            if (winCard) {
                winCard.classList.add('case-reel-card--winner');
                winCard.style.borderColor = winner.rarity.color;
            }
            caseIsSpinning = false;
            setTimeout(() => onDone && onDone(), 400);
        }
    }
    requestAnimationFrame(animate);
}

export function showCaseResult(skin, isNew, onClose) {
    if (!caseResultPopup) return;
    caseResultPopup.classList.remove('hidden');

    caseResultRarity.textContent = skin.rarity.label;
    caseResultRarity.style.color = skin.rarity.color;
    if (skin.rarity.glow) {
        caseResultRarity.style.textShadow = `0 0 10px ${skin.rarity.glow}`;
    } else {
        caseResultRarity.style.textShadow = 'none';
    }
    caseResultName.textContent = skin.name;
    caseResultBonus.textContent = isNew ? '' : '+5 ⭐ (дубликат)';

    const ctx = caseResultCanvas.getContext('2d');
    ctx.clearRect(0, 0, 120, 120);
    drawSkin(ctx, 60, 60, 50, 0, skin.id);

    const newBtn = caseResultCloseBtn.cloneNode(true);
    caseResultCloseBtn.parentNode.replaceChild(newBtn, caseResultCloseBtn);
    _addTap(newBtn, () => {
        caseResultPopup.classList.add('hidden');
        onClose && onClose();
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
