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

// --- CASE SKINS CONFIGURATION ---
export const CASE_COST = 20;

export const RARITY = {
    COMMON:    { id: 'common',    label: 'Обычный',  color: '#AAAAAA', glow: null },
    RARE:      { id: 'rare',      label: 'Редкий',   color: '#4A9EFF', glow: null },
    EPIC:      { id: 'epic',      label: 'Эпик',     color: '#CC44FF', glow: '#CC44FF' },
    LEGENDARY: { id: 'legendary', label: 'Легенда',  color: '#FFD700', glow: '#FFD700' },
};

export const CASE_SKINS = [
    { id: 'case_cherry',     name: 'Вишня',    rarity: RARITY.COMMON,    weight: 14, trailColor: '#FF2244', trailAccent: '#FF8899' },
    { id: 'case_moon',       name: 'Луна',     rarity: RARITY.COMMON,    weight: 14, trailColor: '#AAAAAA', trailAccent: '#FFFFFF' },
    { id: 'case_wood',       name: 'Дерево',   rarity: RARITY.COMMON,    weight: 14, trailColor: '#8B4513', trailAccent: '#D2691E' },
    { id: 'case_slime',      name: 'Слизь',    rarity: RARITY.COMMON,    weight: 13, trailColor: '#44FF44', trailAccent: '#AAFFAA' },
    { id: 'case_strawberry', name: 'Клубника', rarity: RARITY.RARE,      weight: 10, trailColor: '#FF3366', trailAccent: '#FF99BB' },
    { id: 'case_earth',      name: 'Земля',    rarity: RARITY.RARE,      weight: 10, trailColor: '#4499FF', trailAccent: '#44FF99' },
    { id: 'case_prism',      name: 'Призма',   rarity: RARITY.RARE,      weight: 10, trailColor: '#FF44FF', trailAccent: '#44FFFF' },
    { id: 'case_demon',      name: 'Демон',    rarity: RARITY.EPIC,      weight: 6,  trailColor: '#FF2200', trailAccent: '#FF9900' },
    { id: 'case_portal',     name: 'Портал',   rarity: RARITY.EPIC,      weight: 6,  trailColor: '#8800FF', trailAccent: '#00FFFF' },
    { id: 'case_dragon',     name: 'Дракон',   rarity: RARITY.LEGENDARY, weight: 3,  trailColor: '#AA4400', trailAccent: '#FF8800' },
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
