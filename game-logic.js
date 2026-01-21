import { 
    GRAVITY, DRAG_POWER, MAX_PULL_DISTANCE, 
    BALL_RADIUS, HOOP_RADIUS, HOOP_DIAMETER, HOOP_MARGIN, 
    HOOP_TYPE, OBSTACLE_TYPE 
} from './config.js';

// --- FACTORY ---

export function createInitialState(width, height) {
    const state = {
        width: width,
        height: height,
        score: 0,
        isGameOver: false,
        swishCombo: 0,
        shotTouchedRim: false,
        
        cameraY: 0,
        cameraTargetY: 0,
        
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

export function reviveGameLogic(state) {
    state.isGameOver = false;
    resetBallToHoop(state, state.currentHoopIndex);
    state.ball.visible = true;
    state.swishCombo = 0;
}

// --- LOGIC: Update & Helpers ---

export function updatePhysics(dt, state, callbacks) {
    state.cameraY += (state.cameraTargetY - state.cameraY) * 0.1;

    // Hoops
    state.hoops.forEach(h => {
        if (h.scale < h.targetScale) h.scale += 0.08 * dt;
        if (h.type === HOOP_TYPE.MOVING) {
            h.x += h.moveSpeed * h.moveDir * dt;
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

// --- LOGIC HELPERS ---

function addHoop(state, x, y, type = HOOP_TYPE.NORMAL, backboardSide = 0) {
    state.hoops.push({
        x: x, y: y, type: type, backboardSide: backboardSide,
        scale: 0, targetScale: 1, moveSpeed: 1.5,
        moveDir: Math.random() > 0.5 ? 1 : -1, isConquered: false
    });
}

function spawnNewHoop(state, prevHoop = null) {
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
    
    // [ИЗМЕНЕНИЕ] Бесконечное комбо без "потолка"
    let pointsToAdd = 0;
    if (!state.shotTouchedRim) {
        state.swishCombo++;
        pointsToAdd = state.swishCombo; // +1, +2, +3... без ограничений
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
    state.ball.isSitting = true; state.ball.vx = 0; state.ball.vy = 0;
    const h = state.hoops[state.currentHoopIndex];
    if (h.type !== HOOP_TYPE.MOVING) state.ball.x = h.x;
    state.ball.y = h.y;
    state.ballTrail = []; 
    state.cameraTargetY = -h.y + state.height * 0.7;
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

// --- PARTICLES ---

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

// --- DRAWING ---

export function drawGame(ctx, state) {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.save();
    ctx.translate(0, state.cameraY);

    if (state.currentObstacle && state.currentObstacle.type === OBSTACLE_TYPE.WIND) {
        const left = state.currentObstacle.x - state.currentObstacle.w / 2;
        const top = state.currentObstacle.y - state.currentObstacle.h / 2;
        state.currentObstacle.streaks.forEach(s => {
            ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = '#CCCCCC';
            ctx.beginPath(); ctx.rect(left + s.x, top + s.y, s.w, 2); ctx.fill(); ctx.restore();
        });
    }

    if (!state.ball.isSitting && state.ball.visible && state.ballTrail.length > 1) {
        for (let i = 0; i < state.ballTrail.length; i++) {
            const pos = state.ballTrail[i];
            const ratio = i / state.ballTrail.length; 
            const size = BALL_RADIUS * ratio * 0.8; 
            ctx.beginPath();
            const r = 255; const g = Math.floor(ratio * 200); const b = 0;
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${ratio * 0.5})`;
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (state.isDragging && state.ball.isSitting && state.ball.visible) {
        let dx = state.dragStart.x - state.dragCurrent.x;
        let dy = state.dragStart.y - state.dragCurrent.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > MAX_PULL_DISTANCE) {
            const ratio = MAX_PULL_DISTANCE / dist;
            dx *= ratio; dy *= ratio;
        }
        
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        let sx = state.ball.x;
        let sy = state.ball.y;
        let svx = dx * DRAG_POWER;
        let svy = dy * DRAG_POWER;
        
        for(let i=0; i<20; i++) {
            sx += svx * 2;
            sy += svy * 2;
            svy += GRAVITY * 2;

            if (sx < BALL_RADIUS) {
                sx = BALL_RADIUS;
                svx = -svx * 0.6;
            } else if (sx > state.width - BALL_RADIUS) {
                sx = state.width - BALL_RADIUS;
                svx = -svx * 0.6;
            }

            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI*2);
            ctx.fill();
        }
    }

    state.hoops.forEach((h, i) => drawHoopBack(ctx, h, i, state.currentHoopIndex));
    if (state.ball.visible) drawBall(ctx, state.ball);
    state.hoops.forEach((h, i) => drawHoopFront(ctx, h, i, state.currentHoopIndex));
    
    state.particles.forEach(p => {
        if (p.type === 'dot') { 
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color; 
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill(); 
        } else if (p.type === 'text') {
            ctx.save(); ctx.globalAlpha = p.life; ctx.textAlign = 'center'; ctx.font = 'bold 35px Arial';
            if (p.flameIntensity > 0) {
                ctx.fillStyle = '#FF3333'; ctx.shadowColor = '#FFD700'; 
                let blur = p.flameIntensity >= 5 ? 50 : p.flameIntensity * 10 - 5;
                ctx.shadowBlur = Math.max(5, blur);
            } else { ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'black'; ctx.shadowBlur = 4; }
            ctx.fillText(p.text, p.x, p.y); ctx.restore();
        }
    });
    ctx.globalAlpha = 1;

    ctx.restore();
}

function drawBall(ctx, ball) {
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.angle);

    const gradient = ctx.createRadialGradient(-BALL_RADIUS / 3, -BALL_RADIUS / 3, BALL_RADIUS / 4, 0, 0, BALL_RADIUS);
    gradient.addColorStop(0, '#FFB74D'); gradient.addColorStop(1, '#FF9800'); 

    ctx.beginPath(); ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();

    ctx.strokeStyle = '#2e1a0f'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -BALL_RADIUS); ctx.quadraticCurveTo(BALL_RADIUS * 0.4, 0, 0, BALL_RADIUS); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-BALL_RADIUS, 0); ctx.quadraticCurveTo(0, BALL_RADIUS * 0.4, BALL_RADIUS, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, BALL_RADIUS * 0.65, BALL_RADIUS, 0, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = '#BF360C'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
}

function drawHoopBack(ctx, h, index, currentIdx) {
    if(h.scale <= 0) return;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.scale, h.scale);
    
    if (h.type === HOOP_TYPE.BACKBOARD) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 2;
        const boardX = (HOOP_RADIUS + 10) * h.backboardSide;
        ctx.fillRect(boardX - 5, -80, 10, 80); ctx.strokeRect(boardX - 5, -80, 10, 80);
        ctx.beginPath(); ctx.moveTo(HOOP_RADIUS * h.backboardSide * 0.5, 0); ctx.lineTo(boardX, -20); ctx.stroke();
    }

    ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 2;
    const topW = HOOP_RADIUS, botW = HOOP_RADIUS * 0.6, netH = 55;
    for(let i=0; i<=4; i++) {
        let x1 = -topW + (topW*2 * i/4), x2 = -botW + (botW*2 * i/4);
        ctx.moveTo(x1, 0); ctx.lineTo(x2, netH);
    }
    ctx.moveTo(-topW*0.8, netH*0.3); ctx.lineTo(topW*0.8, netH*0.3);
    ctx.moveTo(-topW*0.6, netH*0.6); ctx.lineTo(topW*0.6, netH*0.6);
    ctx.moveTo(-botW, netH); ctx.lineTo(botW, netH);
    ctx.stroke();
    ctx.restore();
}

function drawHoopFront(ctx, h, index, currentIdx) {
    if(h.scale <= 0) return;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.scale, h.scale);
    
    let color = (index === currentIdx + 1) ? '#FF5722' : '#aeaeae'; 
    ctx.strokeStyle = color; ctx.lineWidth = 8; 
    ctx.beginPath(); ctx.ellipse(0, 0, HOOP_RADIUS, HOOP_RADIUS * 0.35, 0, 0, Math.PI*2); ctx.stroke();

    if (h.type === HOOP_TYPE.SPIKED) {
        ctx.fillStyle = h.isConquered ? '#444444' : 'red'; 
        
        const spikeCount = 8;
        for(let i=0; i<spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            const sx = Math.cos(angle) * HOOP_RADIUS;
            const sy = Math.sin(angle) * (HOOP_RADIUS * 0.35);
            
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            
            // [ИЗМЕНЕНИЕ] Возврат к аккуратным шипам (+10 вместо +25)
            const tipX = Math.cos(angle) * (HOOP_RADIUS + 10);
            const tipY = Math.sin(angle) * ((HOOP_RADIUS * 0.35) + 10);
            
            // [ИЗМЕНЕНИЕ] Более тонкое основание (+/- 0.1 вместо +/- 0.15)
            const baseAngle1 = angle - 0.1;
            const baseAngle2 = angle + 0.1;
            
            ctx.lineTo(Math.cos(baseAngle1) * HOOP_RADIUS, Math.sin(baseAngle1) * (HOOP_RADIUS * 0.35));
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(Math.cos(baseAngle2) * HOOP_RADIUS, Math.sin(baseAngle2) * (HOOP_RADIUS * 0.35));
            ctx.fill();
        }
    }
    ctx.restore();
}

// --- INPUT HANDLERS ---

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
