import { HOOP_TYPE, OBSTACLE_TYPE, BALL_RADIUS, HOOP_RADIUS, HOOP_DIAMETER, HOOP_MARGIN, SKINS } from './config.js';

// --- FACTORY ---

export function createInitialState(width, height) {
    // Загрузка скина
    const savedSkin = localStorage.getItem('dunkRise_activeSkin') || 'basketball';
    // Находим конфиг скина для цвета шлейфа
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
        
        // Shop State
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

function addHoop(state, x, y, type = HOOP_TYPE.NORMAL, backboardSide = 0) {
    state.hoops.push({
        x: x, y: y, type: type, backboardSide: backboardSide,
        scale: 0, targetScale: 1, moveSpeed: 1.5,
        moveDir: Math.random() > 0.5 ? 1 : -1, isConquered: false
    });
}

export function spawnNewHoop(state, prevHoop = null) {
    if (!prevHoop) prevHoop = state.hoops[state.hoops.length - 1];
    let attempts = 0, validPosition = false, newX, newY, type, backboardSide;

    do {
        type = HOOP_TYPE.NORMAL;
        if (state.score >= 20 && Math.random() < 0.3) type = HOOP_TYPE.SPIKED;
        else if (prevHoop.type !== HOOP_TYPE.NORMAL) type = HOOP_TYPE.NORMAL;
        else {
            const rand = Math.random();
            if (state.score >= 10) {
                if (rand < 0.5) type = HOOP_TYPE.NORMAL;
                else if (rand < 0.75) type = HOOP_TYPE.BACKBOARD;
                else type = HOOP_TYPE.MOVING;
            } else if (state.score >= 5) {
                if (rand < 0.7) type = HOOP_TYPE.NORMAL;
                else type = HOOP_TYPE.BACKBOARD;
            }
        }

        const minH = state.height * 0.25; 
        const maxH = state.height * 0.45;
        newY = prevHoop.y - (minH + Math.random() * (maxH - minH));

        const minShift = HOOP_DIAMETER * 1.1; 
        const maxShift = state.width * 0.6; 
        let possibleSides = [];
        if (prevHoop.x - minShift > HOOP_MARGIN) possibleSides.push('left');
        if (prevHoop.x + minShift < state.width - HOOP_MARGIN) possibleSides.push('right');
        if (possibleSides.length === 0) possibleSides = ['left', 'right'];

        const side = possibleSides[Math.floor(Math.random() * possibleSides.length)];
        backboardSide = 0;

        if (side === 'left') {
            const leftLimit = Math.max(HOOP_MARGIN, prevHoop.x - maxShift);
            newX = leftLimit + Math.random() * (prevHoop.x - minShift - leftLimit);
            backboardSide = -1;
        } else {
            const rightLimit = Math.min(state.width - HOOP_MARGIN, prevHoop.x + maxShift);
            newX = (prevHoop.x + minShift) + Math.random() * (rightLimit - (prevHoop.x + minShift));
            backboardSide = 1;
        }

        if (type === HOOP_TYPE.BACKBOARD) {
            const safeDistance = HOOP_RADIUS + 25; 
            if (backboardSide === -1) { if (newX - safeDistance < 0) newX = safeDistance + 5; } 
            else { if (newX + safeDistance > state.width) newX = state.width - safeDistance - 5; }
        }

        const dist = Math.sqrt(Math.pow(newX - prevHoop.x, 2) + Math.pow(newY - prevHoop.y, 2));
        if (dist > HOOP_DIAMETER * 1.5) validPosition = true;
        attempts++;
    } while (!validPosition && attempts < 20);

    if (!validPosition) { newY = prevHoop.y - state.height * 0.3; newX = state.width / 2; }
    addHoop(state, newX, newY, type, backboardSide);
    
    state.currentObstacle = null;
    if (state.score >= 15 && Math.random() < 0.30) {
        let forceMult = Math.random() < 0.5 ? 0.5 : 1.0;
        const direction = newX > prevHoop.x ? 1 : -1;
        let dir = Math.random() < 0.7 ? -direction : direction;
        let windStreaks = [];
        for(let i=0; i<20; i++) {
            windStreaks.push({
                x: Math.random() * state.width, y: Math.random() * 150,
                w: 20 + Math.random() * 30, speed: (3 + Math.random() * 4) * forceMult, 
                alpha: 0.1 + Math.random() * 0.4 
            });
        }
        state.currentObstacle = {
            type: OBSTACLE_TYPE.WIND, x: state.width / 2, y: (prevHoop.y + newY)/2, w: state.width, h: 150,
            dir: dir, force: 0.15 * forceMult, streaks: windStreaks
        };
    }

    if (state.hoops.length > 7) { state.hoops.shift(); state.currentHoopIndex--; }
}
