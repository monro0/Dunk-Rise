import { HOOP_TYPE, OBSTACLE_TYPE, BALL_RADIUS, HOOP_RADIUS, HOOP_DIAMETER, HOOP_MARGIN, SKINS } from './config.js';

// --- FACTORY ---

export function createInitialState(width, height) {
    const savedSkin = localStorage.getItem('dunkRise_activeSkin') || 'basketball';
    const skinConfig = SKINS.find(s => s.id === savedSkin) || SKINS[0];

    const state = {
        width: width,
        height: height,
        score: 0,
        isGameOver: false,
        swishCombo: 0,
        shotTouchedRim: false,
        cameraY: 0,
        cameraTargetY: 0,
        
        shop: {
            activeSkin: savedSkin,
            currentTrailColor: skinConfig.trailColor,
            unlockedSkins: ['basketball', 'watermelon', 'zombie']
        },

        ball: { x: 0, y: 0, vx: 0, vy: 0, angle: 0, isSitting: true, visible: true },
        ballTrail: [],
        hoops: [],
        particles: [],
        currentObstacle: null,
        currentHoopIndex: 0,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        dragCurrent: { x: 0, y: 0 }
    };

    addHoop(state, width / 2, height * 0.75, HOOP_TYPE.NORMAL);
    state.hoops[0].isConquered = true;
    spawnNewHoop(state);
    
    state.currentHoopIndex = 0;
    resetBallToHoop(state, 0);

    return state;
}

export function setActiveSkin(state, skinId) {
    const skinConfig = SKINS.find(s => s.id === skinId);
    if (skinConfig) {
        state.shop.activeSkin = skinId;
        state.shop.currentTrailColor = skinConfig.trailColor;
        localStorage.setItem('dunkRise_activeSkin', skinId);
    }
}

export function reviveGameLogic(state) {
    state.isGameOver = false;
    resetBallToHoop(state, state.currentHoopIndex);
    state.ball.visible = true;
    state.swishCombo = 0;
}

// --- HELPERS ---

export function resetBallToHoop(state, index) {
    if (!state.hoops[index]) return;
    const h = state.hoops[index];
    state.ball.x = h.x; 
    state.ball.y = h.y;
    state.ball.vx = 0; state.ball.vy = 0;
    state.ball.isSitting = true; 
    state.ball.visible = true; 
    state.ballTrail = []; 
    state.shotTouchedRim = false;
    state.cameraTargetY = -h.y + state.height * 0.7;
}

// --- SPAWNER LOGIC (PING-PONG + RAILS) ---

export function spawnNewHoop(state, prevHoop = null) {
    if (!prevHoop) prevHoop = state.hoops[state.hoops.length - 1];
    
    // --- 1. ВЫБОР ТИПА (ФИНАЛЬНЫЙ БАЛАНС) ---
    let type = HOOP_TYPE.NORMAL;
    const score = state.score;

    // Кривая сложности:
    if (score >= 5) {
        const rand = Math.random();
        
        // Чем выше счет, тем больше шансов на жесть
        if (score >= 25 && rand < 0.25) type = HOOP_TYPE.SPIKED; // Шипы (после 25 очков)
        else if (score >= 15 && rand < 0.45) type = HOOP_TYPE.MOVING; // Движение (после 15)
        else if (score >= 5 && rand < 0.5) type = HOOP_TYPE.BACKBOARD; // Щит (после 5)
    }

    // Даем передышку после сложного кольца
    if (prevHoop.type === HOOP_TYPE.MOVING || prevHoop.type === HOOP_TYPE.SPIKED) {
        type = HOOP_TYPE.NORMAL;
    }

    // --- 2. РАСЧЕТ ПОЗИЦИИ (ПИНГ-ПОНГ) ---
    const centerX = state.width / 2;
    const isPrevLeft = prevHoop.x < centerX;
    
    let newX, newY;
    const minJumpHeight = 220;
    const maxJumpHeight = 300;
    newY = prevHoop.y - (minJumpHeight + Math.random() * (maxJumpHeight - minJumpHeight));

    const wallZone = 35; 
    
    if (isPrevLeft) { // Было СЛЕВА -> Ставим СПРАВА
        const minX = centerX + 40;
        const maxX = state.width - HOOP_RADIUS;
        let rawX = minX + Math.random() * (maxX - minX);
        if (rawX > state.width - HOOP_RADIUS - wallZone) newX = state.width - (HOOP_RADIUS + 5);
        else newX = rawX;
    } else { // Было СПРАВА -> Ставим СЛЕВА
        const minX = HOOP_RADIUS;
        const maxX = centerX - 40;
        let rawX = minX + Math.random() * (maxX - minX);
        if (rawX < HOOP_RADIUS + wallZone) newX = HOOP_RADIUS + 5;
        else newX = rawX;
    }

    // --- 3. ДВИЖУЩЕЕСЯ КОЛЬЦО (РЕЛЬСЫ) ---
    if (type === HOOP_TYPE.MOVING) {
        const moveRange = 70;
        let moveMinX = Math.max(HOOP_RADIUS + 10, newX - moveRange);
        let moveMaxX = Math.min(state.width - HOOP_RADIUS - 10, newX + moveRange);
        
        if (newX < centerX) { if (moveMaxX > centerX - 20) moveMaxX = centerX - 20; }
        else { if (moveMinX < centerX + 20) moveMinX = centerX + 20; }
        
        state.hoops.push({
            x: newX, y: newY, type: type, backboardSide: 0,
            scale: 0, targetScale: 1, 
            moveSpeed: 1.0, moveDir: Math.random() > 0.5 ? 1 : -1, 
            minX: moveMinX, maxX: moveMaxX,
            isConquered: false
        });
        return; 
    }

    // --- 4. ЩИТ ---
    const distToLeftWall = newX - HOOP_RADIUS;
    const distToRightWall = state.width - (newX + HOOP_RADIUS);
    const isAtWall = distToLeftWall < 15 || distToRightWall < 15;
    let backboardSide = 0;

    if (type === HOOP_TYPE.BACKBOARD) {
        if (isAtWall) type = HOOP_TYPE.NORMAL;
        else {
            if (newX < centerX) {
                backboardSide = -1; 
                if (newX < HOOP_RADIUS + 30) newX = HOOP_RADIUS + 30;
            } else {
                backboardSide = 1; 
                if (newX > state.width - HOOP_RADIUS - 30) newX = state.width - HOOP_RADIUS - 30;
            }
        }
    }

    addHoop(state, newX, newY, type, backboardSide);
    
    // --- 5. ВЕТЕР (ИСПРАВЛЕНО: Чаще и раньше) ---
    state.currentObstacle = null;
    // Снизили порог очков с 20 до 12. Повысили шанс с 0.2 до 0.3.
    if (score >= 12 && Math.random() < 0.3) {
        let forceMult = Math.random() < 0.5 ? 0.6 : 0.9; // Чуть усилили
        const windDir = isPrevLeft ? -1 : 1; // Против движения игрока
        
        let windStreaks = [];
        for(let i=0; i<18; i++) { // Чуть больше полосок ветра
            windStreaks.push({
                x: Math.random() * state.width, y: Math.random() * 150,
                w: 20 + Math.random() * 40, speed: (4 + Math.random() * 5) * forceMult, 
                alpha: 0.1 + Math.random() * 0.3 
            });
        }
        state.currentObstacle = {
            type: OBSTACLE_TYPE.WIND, x: state.width / 2, y: (prevHoop.y + newY)/2, w: state.width, h: 220,
            dir: windDir, force: 0.14 * forceMult, streaks: windStreaks
        };
    }

    if (state.hoops.length > 6) { state.hoops.shift(); state.currentHoopIndex--; }
}


function addHoop(state, x, y, type = HOOP_TYPE.NORMAL, backboardSide = 0) {
    state.hoops.push({
        x: x, y: y, type: type, backboardSide: backboardSide,
        scale: 0, targetScale: 1, moveSpeed: 1.5,
        moveDir: Math.random() > 0.5 ? 1 : -1, isConquered: false
    });
}
