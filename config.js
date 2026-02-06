// --- CONFIGURATION & CONSTANTS ---

// Глобальные настройки игры
export const GameSettings = {
    vibration: true // По умолчанию включено
};

// Физика
export const GRAVITY = 0.6;
export const DRAG_POWER = 0.16;
export const MAX_PULL_DISTANCE = 200; 

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
    BALL_RADIUS = 22;
    HOOP_RADIUS = 46;
    HOOP_DIAMETER = HOOP_RADIUS * 2;
    HOOP_MARGIN = 50;
}
