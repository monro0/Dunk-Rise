import { MAX_PULL_DISTANCE, DRAG_POWER } from './config.js';

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
    
    if (dist < 30) return;

    if (dist > MAX_PULL_DISTANCE) {
        const ratio = MAX_PULL_DISTANCE / dist;
        dx *= ratio; dy *= ratio;
    }

    state.ball.vx = dx * DRAG_POWER;
    state.ball.vy = dy * DRAG_POWER;
    state.ball.isSitting = false;
    state.shotTouchedRim = false;
}
