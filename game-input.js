import { MAX_PULL_DISTANCE, DRAG_POWER } from './config.js';
import { playSound } from './audio.js'; // <--- 1. ИМПОРТ

export function handleStartDrag(pos, state) {
    if (state.isGameOver || !state.ball.isSitting) return;
    state.isDragging = true;
    state.dragStart = pos;
    state.dragCurrent = pos;
}

export function handleMoveDrag(pos, state) {
    if (!state.isDragging) return;
    state.dragCurrent = pos;
}

export function handleEndDrag(state) {
    if (!state.isDragging) return;
    state.isDragging = false;
    
    let dx = state.dragStart.x - state.dragCurrent.x;
    let dy = state.dragStart.y - state.dragCurrent.y;
    let dist = Math.sqrt(dx*dx + dy*dy);
    
    // Если оттянули слишком слабо — отменяем бросок (и звук не играем)
    if (dist < 30) return;

    if (dist > MAX_PULL_DISTANCE) {
        const ratio = MAX_PULL_DISTANCE / dist;
        dx *= ratio; dy *= ratio;
    }

    state.ball.vx = dx * DRAG_POWER;
    state.ball.vy = dy * DRAG_POWER;
    state.ball.isSitting = false;
    state.shotTouchedRim = false;

    // <--- 2. ЗВУК БРОСКА
    // Громкость 0.4, чтобы "вух" не заглушал остальные звуки
    playSound('throw', 0.4); 
}
