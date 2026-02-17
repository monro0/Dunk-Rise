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
        trailColor: '#FF7A2E',
        trailAccent: '#FFD28A'
    },
    { 
        id: 'watermelon', 
        name: 'Арбуз', 
        price: 0, 
        trailColor: '#FF2D55',
        trailAccent: '#6BFF7A'
    },
    { 
        id: 'zombie', 
        name: 'Зомби', 
        price: 0, 
        trailColor: '#40E6C5',
        trailAccent: '#B6FF6B'
    },
    { 
        id: 'cosmic', 
        name: 'Космос', 
        price: 1, 
        trailColor: '#8B5BFF',
        trailAccent: '#4AD7FF'
    },
    { id: 'neon', name: 'Неон', price: 10, trailColor: '#00F5FF', trailAccent: '#FF3DFF' },
    { id: 'galaxy', name: 'Галактика', price: 20, trailColor: '#B000FF', trailAccent: '#2ED6FF' },
    { id: 'golden', name: 'Золотой', price: 50, trailColor: '#FFD34D', trailAccent: '#FF9F1A' }
];

// Физика
export const GRAVITY = 0.75;        // Высокая гравитация для крутых дуг
export const DRAG_POWER = 0.20;     // Мощный бросок, чтобы компенсировать тяжесть
export const MAX_PULL_DISTANCE = 150; // Короткий ход "резинки" (было 200). Это важно! 

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
    HOOP_RADIUS = 42; // Было 46. Дадим чуть больше места ошибке.
    HOOP_DIAMETER = HOOP_RADIUS * 2;
    HOOP_MARGIN = 45;
}
