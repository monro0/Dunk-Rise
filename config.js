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
        name: 'Жемчуг',
        price: 0,
        trailColor: '#DDB8FF',
        trailAccent: '#FFFFFF'
    },
    {
        id: 'zombie',
        name: 'Мрамор',
        price: 0,
        trailColor: '#4AABFF',
        trailAccent: '#B0DDFF'
    },
    {
        id: 'cosmic',
        name: 'Плазма',
        price: 1,
        trailColor: '#4499FF',
        trailAccent: '#CCEEFF'
    },
    { id: 'neon', name: 'Лава', price: 10, trailColor: '#FF5500', trailAccent: '#FFB340' },
    { id: 'galaxy', name: 'Туманность', price: 20, trailColor: '#CC44FF', trailAccent: '#FF99FF' },
    { id: 'golden', name: 'Кристалл', price: 50, trailColor: '#00CCDD', trailAccent: '#AAFFEE' }
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
