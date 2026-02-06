import { GRAVITY, BALL_RADIUS, HOOP_RADIUS, HOOP_TYPE, OBSTACLE_TYPE } from './config.js';
import { spawnNewHoop, resetBallToHoop } from './game-state.js';

export function updateGame(dt, state, callbacks) {
    state.cameraY += (state.cameraTargetY - state.cameraY) * 0.1;

    // Hoops
    state.hoops.forEach(h => {
        if (h.scale < h.targetScale) h.scale += 0.08 * dt;
        if (h.type === HOOP_TYPE.MOVING) {
            h.x += h.moveSpeed * h.moveDir * dt;
            const HOOP_MARGIN = 50; // Or import from config
            if (h.x > state.width - HOOP_MARGIN) { h.x = state.width - HOOP_MARGIN; h.moveDir = -1; } 
            else if (h.x < HOOP_MARGIN) { h.x = HOOP_MARGIN; h.moveDir = 1; }
            
            if (state.ball.isSitting && state.hoops[state.currentHoopIndex] === h) { 
                state.ball.x = h.x; 
            }
        }
    });

    // Wind
    if (state.currentObstacle && state.currentObstacle.type === OBSTACLE_TYPE.WIND) {
        state.currentObstacle.streaks.forEach(s => {
            s.x += s.speed * state.currentObstacle.dir * dt;
            if (state.currentObstacle.dir > 0 && s.x > state.currentObstacle.w) { s.x = -s.w; s.y = Math.random() * state.currentObstacle.h; }
            if (state.currentObstacle.dir < 0 && s.x < -s.w) { s.x = state.currentObstacle.w; s.y = Math.random() * state.currentObstacle.h; }
        });
    }

    // Ball
    if (!state.ball.isSitting) {
        state.ball.vy += GRAVITY * dt;
        state.ball.x += state.ball.vx * dt;
        state.ball.y += state.ball.vy * dt;
        state.ball.angle += state.ball.vx * 0.05 * dt;

        if (state.ball.visible) {
            state.ballTrail.push({x: state.ball.x, y: state.ball.y});
            if (state.ballTrail.length > 30) state.ballTrail.shift();
        }

        // Wind force
        if (state.currentObstacle && state.currentObstacle.type === OBSTACLE_TYPE.WIND) {
            const top = state.currentObstacle.y - state.currentObstacle.h / 2;
            const bottom = state.currentObstacle.y + state.currentObstacle.h / 2;
            if (state.ball.y > top && state.ball.y < bottom) {
                state.ball.vx += state.currentObstacle.force * state.currentObstacle.dir * dt;
                state.ball.angle += state.currentObstacle.dir * 0.05 * dt;
            }
        }

        // Walls
        if (state.ball.x < BALL_RADIUS) { state.ball.x = BALL_RADIUS; state.ball.vx *= -0.6; } 
        else if (state.ball.x > state.width - BALL_RADIUS) { state.ball.x = state.width - BALL_RADIUS; state.ball.vx *= -0.6; }

        let safeIndex = Math.max(0, state.currentHoopIndex - 1);
        let safeRing = state.hoops[safeIndex];
        if (safeRing && state.ball.y + state.cameraY > (safeRing.y + state.cameraY) + 350) {
            callbacks.onDeath(state.score);
            state.isGameOver = true; 
        }

        checkCollisions(dt, state, callbacks);
    } else {
        const h = state.hoops[state.currentHoopIndex];
        if (h && h.type !== HOOP_TYPE.MOVING) {
            state.ball.x += (h.x - state.ball.x) * 0.2 * dt;
            state.ball.y += (h.y - state.ball.y) * 0.2 * dt;
        } else if (h && h.type === HOOP_TYPE.MOVING) {
            state.ball.y += (h.y - state.ball.y) * 0.2 * dt;
        }
        if (state.ballTrail.length > 0) state.ballTrail = [];
    }

    updateParticles(dt, state);
}

function checkCollisions(dt, state, callbacks) {
    [state.currentHoopIndex + 1, state.currentHoopIndex, state.currentHoopIndex - 1].forEach(idx => {
        if (idx >= 0 && idx < state.hoops.length) {
            let h = state.hoops[idx];
            
            if (h.type === HOOP_TYPE.SPIKED && !h.isConquered && h === state.hoops[state.currentHoopIndex + 1]) {
                const rims = [h.x - HOOP_RADIUS, h.x + HOOP_RADIUS];
                let hitSpike = false;
                rims.forEach(rx => {
                    const dist = Math.sqrt(Math.pow(state.ball.x - rx, 2) + Math.pow(state.ball.y - h.y, 2));
                    if (dist < BALL_RADIUS + 2) hitSpike = true;
                });
                if (hitSpike) { popBall(state, callbacks); return; }
            }

            const distToCenter = Math.abs(state.ball.x - h.x);
            const distY = Math.abs(state.ball.y - h.y);
            if (distToCenter < 15 && distY < 15) { state.ball.x += (h.x - state.ball.x) * 0.05 * dt; }

            if (h.type === HOOP_TYPE.BACKBOARD) {
                const boardX = h.x + (HOOP_RADIUS + 10) * h.backboardSide;
                const boardY = h.y - 40; 
                if (state.ball.y > boardY - 40 && state.ball.y < boardY + 40 && Math.abs(state.ball.x - boardX) < BALL_RADIUS + 5) {
                    state.ball.vx = -h.backboardSide * Math.abs(state.ball.vx) * 0.8;
                    if (Math.abs(state.ball.vx) < 2) state.ball.vx = -h.backboardSide * 4;
                    state.ball.x = boardX - (h.backboardSide * (BALL_RADIUS + 5 + 1));
                }
            }

            [h.x - HOOP_RADIUS, h.x + HOOP_RADIUS].forEach(rx => {
                const dx = state.ball.x - rx;
                const dy = state.ball.y - h.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < BALL_RADIUS + 5) {
                    if (!state.ball.isSitting) state.shotTouchedRim = true;
                    const nx = dx / dist; const ny = dy / dist;
                    const vDotN = state.ball.vx * nx + state.ball.vy * ny;
                    state.ball.vx -= 1.4 * vDotN * nx;
                    state.ball.vy -= 1.4 * vDotN * ny;
                    state.ball.x += nx * (BALL_RADIUS + 5 - dist);
                    state.ball.y += ny * (BALL_RADIUS + 5 - dist);
                }
            });

            if (state.ball.vy > 0 && state.ball.y > h.y - 15 && state.ball.y < h.y + 25 && Math.abs(state.ball.x - h.x) < HOOP_RADIUS * 0.85) {
                if (idx > state.currentHoopIndex) handleScore(h, state, callbacks);
                else recoverBall(idx, state);
            }
        }
    });
}

function handleScore(targetHoop, state, callbacks) {
    if (targetHoop.isConquered) { recoverBall(state.hoops.indexOf(targetHoop), state); return; }
    targetHoop.isConquered = true;
    
    // Вызываем тактильную отдачу (Haptic Feedback)
    if (callbacks.onHaptic) {
        // Если мяч не коснулся кольца (чистое попадание) - отдача сильнее (medium)
        // Если обычное попадание - отдача легче (light)
        const hapticStyle = !state.shotTouchedRim ? 'medium' : 'light';
        callbacks.onHaptic(hapticStyle);
    }

    let pointsToAdd = 0;
    if (!state.shotTouchedRim) {
        state.swishCombo++;
        pointsToAdd = state.swishCombo;
    } else {
        state.swishCombo = 0;
        pointsToAdd = 1;
    }
    
    state.score += pointsToAdd;
    callbacks.onScore(state.score);

    createFloatingText(state, state.ball.x, state.ball.y - 50, `+${pointsToAdd}`, !state.shotTouchedRim ? pointsToAdd : 0);
    createParticles(state, state.ball.x, state.ball.y, 25);
    
    state.currentHoopIndex++;
    state.ball.isSitting = true; state.ball.vx = 0; state.ball.vy = 0;
    if (targetHoop.type !== HOOP_TYPE.MOVING) state.ball.x = targetHoop.x;
    state.ball.y = targetHoop.y;
    state.ballTrail = []; 
    
    const h = state.hoops[state.currentHoopIndex];
    state.cameraTargetY = -h.y + state.height * 0.7;
    if (state.currentHoopIndex === state.hoops.length - 1) spawnNewHoop(state);
}

function recoverBall(index, state) {
    state.swishCombo = 0; 
    state.currentHoopIndex = index;
    resetBallToHoop(state, index);
    createParticles(state, state.ball.x, state.ball.y, 10);
}

function popBall(state, callbacks) {
    if (!state.ball.visible) return;
    state.ball.visible = false;
    createParticles(state, state.ball.x, state.ball.y, 40, '#480d5b'); 
    setTimeout(() => { 
        callbacks.onDeath(state.score);
        state.isGameOver = true; 
    }, 500); 
}

function createParticles(state, x, y, n, colorOverride = null) {
    for(let i=0; i<n; i++) {
        state.particles.push({
            type: 'dot', x, y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, 
            life: 1, color: colorOverride || `hsl(${20+Math.random()*30}, 100%, 50%)`
        });
    }
}

function createFloatingText(state, x, y, text, flameIntensity) {
    state.particles.push({ type: 'text', text, x, y, vy: -2, life: 1.0, flameIntensity });
}

function updateParticles(dt, state) {
    for(let i=state.particles.length-1; i>=0; i--) {
        let p = state.particles[i];
        if (p.type === 'dot') {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.5 * dt; p.life -= 0.03 * dt;
        } else if (p.type === 'text') {
            p.y += p.vy * dt; p.life -= 0.015 * dt;
        }
        if(p.life <= 0) state.particles.splice(i, 1);
    }
}
