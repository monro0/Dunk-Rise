import { MAX_PULL_DISTANCE, DRAG_POWER, GRAVITY, BALL_RADIUS, HOOP_RADIUS, HOOP_TYPE, OBSTACLE_TYPE } from './config.js';

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

            if (sx < BALL_RADIUS) { sx = BALL_RADIUS; svx = -svx * 0.6; } 
            else if (sx > state.width - BALL_RADIUS) { sx = state.width - BALL_RADIUS; svx = -svx * 0.6; }

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
            
            const tipX = Math.cos(angle) * (HOOP_RADIUS + 10);
            const tipY = Math.sin(angle) * ((HOOP_RADIUS * 0.35) + 10);
            
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
