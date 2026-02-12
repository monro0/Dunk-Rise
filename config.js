// --- CONFIGURATION & CONSTANTS ---

// Глобальные настройки игры
export const GameSettings = {
    vibration: true,
    sound: true // <--- Добавили
};

// --- SKINS CONFIGURATION ---
export const SKINS = [
    { 
        id: 'basketball', 
        name: 'Баскетбол', 
        price: 0, 
        trailColor: '#FF5722' 
    },
    { 
        id: 'watermelon', 
        name: 'Арбуз', 
        price: 0, 
        trailColor: '#F44336' // Красный (мякоть)
    },
    { 
        id: 'zombie', 
        name: 'Зомби', 
        price: 0, 
        trailColor: '#80CBC4' // Бирюзовый (под цвет скина)
    }
];

// Физика
export const GRAVITY = 1.1;        // Высокая гравитация для крутых дуг
export const DRAG_POWER = 0.30;     // Мощный бросок, чтобы компенсировать тяжесть
export const MAX_PULL_DISTANCE = 140; // Короткий ход "резинки" (было 200). Это важно! 

// Типы
export const HOOP_TYPE = {
    NORMAL: 'normal',
    BACKBOARD: 'backboard', 
    MOVING: 'moving',
    SPIKED: 'spiked'
};

export const OBSTACLE_TYPE = {
    NONE: 'none',
    WIND: 'wind',
};

// --- ДИНАМИЧЕСКИЕ НАСТРОЙКИ ---

export let BALL_RADIUS;
export let HOOP_RADIUS;
export let HOOP_DIAMETER;
export let HOOP_MARGIN;

export function initializeConfig(canvas) {
    // Чуть увеличим кольца для комфортной игры с тяжелым мячом
    BALL_RADIUS = 22;
    HOOP_RADIUS = 48; // Было 46. Дадим чуть больше места ошибке.
    HOOP_DIAMETER = HOOP_RADIUS * 2;
    HOOP_MARGIN = 50;
}
