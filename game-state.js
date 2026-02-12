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
        // --- 1. ВЫБОР ТИПА КОЛЬЦА ---
        type = HOOP_TYPE.NORMAL;
        if (state.score >= 20 && Math.random() < 0.3) type = HOOP_TYPE.SPIKED;
        else if (prevHoop.type !== HOOP_TYPE.NORMAL) type = HOOP_TYPE.NORMAL; // После сложного - обычное
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

        // --- 2. РАСЧЕТ ПОЗИЦИИ (Compact Gameplay) ---

        // Высота (Y): Фиксированный диапазон в пикселях (200-320px).
        // Это предотвращает огромные прыжки на высоких экранах.
        const minH = 200; 
        const maxH = 320; 
        newY = prevHoop.y - (minH + Math.random() * (maxH - minH));

        // Горизонталь (X): Сдвиг влево или вправо на 80-250px.
        const minShift = 80;  
        const maxShift = 250; 
        
        let possibleSides = [];
        // Проверяем место слева
        if (prevHoop.x - minShift > HOOP_MARGIN) possibleSides.push('left');
        // Проверяем место справа
        if (prevHoop.x + minShift < state.width - HOOP_MARGIN) possibleSides.push('right');
        
        if (possibleSides.length === 0) possibleSides = ['left', 'right']; // Редкий случай

        const side = possibleSides[Math.floor(Math.random() * possibleSides.length)];
        backboardSide = 0;

        if (side === 'left') {
            const availableSpace = prevHoop.x - HOOP_MARGIN;
            // Сдвигаем влево, но не дальше чем есть места
            const shift = minShift + Math.random() * (Math.min(availableSpace, maxShift) - minShift);
            newX = prevHoop.x - shift;
            backboardSide = -1; // Щит будет справа от кольца
        } else {
            const availableSpace = state.width - HOOP_MARGIN - prevHoop.x;
            // Сдвигаем вправо
            const shift = minShift + Math.random() * (Math.min(availableSpace, maxShift) - minShift);
            newX = prevHoop.x + shift;
            backboardSide = 1; // Щит будет слева от кольца
        }

        // Корректировка для Щита (чтобы не влезал в стены)
        if (type === HOOP_TYPE.BACKBOARD) {
            const safeDistance = HOOP_RADIUS + 30; 
            if (backboardSide === -1) { 
                if (newX < safeDistance) newX = safeDistance; 
            } else { 
                if (newX > state.width - safeDistance) newX = state.width - safeDistance; 
            }
        }

        // Проверка: достаточно ли далеко от предыдущего (чтобы не накладывались)
        const dist = Math.sqrt(Math.pow(newX - prevHoop.x, 2) + Math.pow(newY - prevHoop.y, 2));
        if (dist > 150) validPosition = true;

        attempts++;
    } while (!validPosition && attempts < 20);

    // Фоллбэк (если не нашли место за 20 попыток)
    if (!validPosition) { 
        newY = prevHoop.y - 250; 
        newX = state.width / 2; 
        type = HOOP_TYPE.NORMAL;
    }

    addHoop(state, newX, newY, type, backboardSide);
    
    // --- 3. ДОБАВЛЕНИЕ ВЕТРА (Опционально) ---
    state.currentObstacle = null;
    if (state.score >= 15 && Math.random() < 0.30) {
        // ... (Ветер - без изменений)
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

    // --- 4. ОЧИСТКА ---
    if (state.hoops.length > 7) { state.hoops.shift(); state.currentHoopIndex--; }
}
