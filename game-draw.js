import { MAX_PULL_DISTANCE, DRAG_POWER, GRAVITY, BALL_RADIUS, HOOP_RADIUS, HOOP_TYPE, OBSTACLE_TYPE } from './config.js';

export function drawGame(ctx, state) {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.save();
    ctx.translate(0, state.cameraY);

    // 1. ФОНОВЫЕ ЭФФЕКТЫ (Ветер)
    if (state.currentObstacle && state.currentObstacle.type === OBSTACLE_TYPE.WIND) {
        const left = state.currentObstacle.x - state.currentObstacle.w / 2;
        const top = state.currentObstacle.y - state.currentObstacle.h / 2;
        state.currentObstacle.streaks.forEach(s => {
            ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = '#CCCCCC';
            ctx.beginPath(); ctx.rect(left + s.x, top + s.y, s.w, 2); ctx.fill(); ctx.restore();
        });
    }

    // 2. СЛОЙ 1: ЗАДНИЕ ЧАСТИ КОЛЕЦ (Щит, Сетка, Задняя дужка) + звёзды над кольцами
    state.hoops.forEach((h, i) => {
        const isNextHoop = (i === state.currentHoopIndex + 1);
        
        if (h.type === HOOP_TYPE.MOVING && h.scale > 0.5) {
            drawHoopRail(ctx, h);
        }

        drawHoopBackElements(ctx, h, isNextHoop);

        if (h.hasStar && h.scale > 0.3) {
            drawStarAboveHoop(ctx, h);
        }
    });

    // 3. СЛОЙ 2: МЯЧ И ШЛЕЙФ
    // Шлейф
    if (!state.ball.isSitting && state.ball.visible && state.ballTrail.length > 1) {
        const trailColor = state.shop.currentTrailColor || '#FF5722';
        for (let i = 0; i < state.ballTrail.length; i++) {
            const pos = state.ballTrail[i];
            const ratio = i / state.ballTrail.length; 
            const size = BALL_RADIUS * ratio * 0.8; 
            
            ctx.beginPath();
            ctx.fillStyle = hexToRgba(trailColor, ratio * 0.5);
            ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Aim Line (Линия прицеливания)
    if (state.isDragging && state.ball.isSitting && state.ball.visible) {
        let dx = state.dragStart.x - state.dragCurrent.x;
        let dy = state.dragStart.y - state.dragCurrent.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > MAX_PULL_DISTANCE) {
            const ratio = MAX_PULL_DISTANCE / dist;
            dx *= ratio; dy *= ratio;
        }
        
        ctx.fillStyle = state.shop.currentTrailColor || '#FF5722';
        
        let sx = state.ball.x;
        let sy = state.ball.y;
        let svx = dx * DRAG_POWER;
        let svy = dy * DRAG_POWER;
        
        // 2. 10 ТОЧЕК (Компактный прицел)
        for(let i=0; i<10; i++) {
            // Уменьшили шаг с 4.5 до 3.5 (точки плотнее)
            // Уменьшили кол-во точек с 12 до 10 (линия короче)
            sx += svx * 3.5;
            sy += svy * 3.5;
            svy += GRAVITY * 3.5;

            if (sx < BALL_RADIUS) { sx = BALL_RADIUS; svx = -svx * 0.6; } 
            else if (sx > state.width - BALL_RADIUS) { sx = state.width - BALL_RADIUS; svx = -svx * 0.6; }

            ctx.beginPath();
            // Размер точки чуть меньше (2.5px вместо 3) для аккуратности
            ctx.arc(sx, sy, 2.5, 0, Math.PI*2); 
            ctx.fill();
        }

    }

    // Сам Мяч
    if (state.ball.visible) {
        drawSkin(ctx, state.ball.x, state.ball.y, BALL_RADIUS, state.ball.angle, state.shop.activeSkin);
    }

    // 4. СЛОЙ 3: ПЕРЕДНИЕ ЧАСТИ КОЛЕЦ (Передняя дужка)
    state.hoops.forEach((h, i) => {
        const isNextHoop = (i === state.currentHoopIndex + 1);
        drawHoopFrontElements(ctx, h, isNextHoop);
    });
    
    // 5. ЧАСТИЦЫ (поверх всего)
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

export function drawSkin(ctx, x, y, r, angle, skinId) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    switch(skinId) {
        case 'watermelon':
            drawWatermelon(ctx, r);
            break;
        case 'zombie':
            drawZombie(ctx, r);
            break;
        case 'cosmic':
            drawCosmic(ctx, r);
            break;
        case 'neon':
            drawNeon(ctx, r);
            break;
        case 'galaxy':
            drawGalaxy(ctx, r);
            break;
        case 'golden':
            drawGolden(ctx, r);
            break;
        case 'basketball':
        default:
            drawBasketball(ctx, r);
            break;
    }

    ctx.restore();
}

function hexToRgba(hex, alpha) {
    let c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
    }
    return `rgba(255,87,34, ${alpha})`;
}

// --- HELPER: Draw Rail for Moving Hoops ---
function drawHoopRail(ctx, h) {
    ctx.save();
    // Рисуем линию на 60px ниже центра кольца
    const railY = h.y + 60; 
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Полупрозрачный белый
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 10]); // Пунктир
    ctx.lineCap = 'round';
    
    // Рисуем от minX до maxX
    // (Эти свойства должны быть заданы в game-state.js при спавне)
    if (h.minX !== undefined && h.maxX !== undefined) {
        ctx.moveTo(h.minX, railY);
        ctx.lineTo(h.maxX, railY);
    }
    ctx.stroke();

    // Рисуем "стопперы" по краям
    ctx.setLineDash([]); 
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    
    if (h.minX !== undefined) {
        ctx.beginPath(); ctx.arc(h.minX, railY, 4, 0, Math.PI*2); ctx.fill();
    }
    if (h.maxX !== undefined) {
        ctx.beginPath(); ctx.arc(h.maxX, railY, 4, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
}

// --- PROCEDURAL SKINS ---

function drawBasketball(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#FFB74D'); 
    gradient.addColorStop(1, '#FF9800'); 
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
    ctx.strokeStyle = '#2e1a0f'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.4, 0, 0, r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, r * 0.4, r, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.65, r, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#BF360C'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawWatermelon(ctx, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#90EE90'; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#1B5E20'; 
    const numStripes = 5; const stripeWidth = r * 0.4; const step = (r * 2.5) / numStripes;
    for (let i = 0; i < numStripes; i++) {
        let startX = -r * 1.2 + (step * i);
        ctx.beginPath(); ctx.moveTo(startX, -r);
        for (let y = -r; y <= r; y += 5) {
            let wobble = Math.sin(y * 0.05 + i) * (r * 0.15); 
            let sphereBulge = Math.cos(y / r * 1.5) * (r * 0.1);
            ctx.lineTo(startX + wobble + sphereBulge, y);
        }
        for (let y = r; y >= -r; y -= 5) {
            let wobble = Math.sin(y * 0.05 + i) * (r * 0.15);
            let sphereBulge = Math.cos(y / r * 1.5) * (r * 0.1);
            ctx.lineTo(startX + stripeWidth + wobble + sphereBulge, y);
        }
        ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#1B5E20'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawZombie(ctx, r) {
    const gradient = ctx.createRadialGradient(-r/3, -r/3, r/4, 0, 0, r);
    gradient.addColorStop(0, '#B2DFDB'); gradient.addColorStop(1, '#80CBC4'); 
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
    function drawStaticEye(cx, cy, radius) {
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#00695C'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(cx + radius*0.3, cy, radius * 0.3, 0, Math.PI*2); ctx.fill();
    }
    drawStaticEye(-r * 0.35, -r * 0.2, r * 0.32);
    drawStaticEye(r * 0.4, -r * 0.25, r * 0.22);
    ctx.strokeStyle = '#3E2723'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.4); ctx.quadraticCurveTo(0, r * 0.6, r * 0.4, r * 0.35); ctx.stroke();
    ctx.lineWidth = r * 0.05; const stitchY = r * 0.45; const stitchX = [-r * 0.2, 0, r * 0.2];
    stitchX.forEach(x => { ctx.beginPath(); ctx.moveTo(x, stitchY - (r*0.1)); ctx.lineTo(x, stitchY + (r*0.1)); ctx.stroke(); });
    ctx.strokeStyle = '#00695C'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 0.4, -r * 0.7); ctx.stroke();
}

function drawCosmic(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#9C27B0');
    gradient.addColorStop(0.6, '#673AB7');
    gradient.addColorStop(1, '#3F51B5');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawNeon(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#E0F7FA');
    gradient.addColorStop(0.5, '#00FFFF');
    gradient.addColorStop(1, '#0097A7');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawGalaxy(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#E1BEE7');
    gradient.addColorStop(0.4, '#AA00FF');
    gradient.addColorStop(1, '#4A148C');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(170, 0, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawGolden(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#FFF8E1');
    gradient.addColorStop(0.5, '#FFD700');
    gradient.addColorStop(1, '#FF8F00');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// --- STAR ABOVE HOOP ---
function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3; // начинаем с верхней точки (270°)
    let step = Math.PI / spikes;
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerR;
        let y = cy + Math.sin(rot) * outerR;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerR;
        y = cy + Math.sin(rot) * innerR;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.closePath();
    ctx.fill();
}

function drawStarAboveHoop(ctx, h) {
    const starY = h.y - 70 + (h.starOffsetY || 0);
    ctx.save();
    ctx.translate(h.x, starY);
    const pulse = 1 + 0.12 * Math.sin(Date.now() * 0.005);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFA500';
    ctx.shadowBlur = 15;
    drawStar(ctx, 0, 0, 5, 15, 7);
    ctx.shadowBlur = 0;
    ctx.restore();
}

// --- HOOP RENDERING ---

function drawHoopBackElements(ctx, h, isNextHoop) {
    if(h.scale <= 0) return;
    
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.scale, h.scale);

    // Цвет задней части обода
    let rimColorDark;
    if (h.type === HOOP_TYPE.SPIKED) {
        rimColorDark = '#37474F';
    } else if (h.type === HOOP_TYPE.MOVING) {
        rimColorDark = '#00838F'; // Dark Cyan (Tech style)
    } else {
        rimColorDark = isNextHoop ? '#D84315' : '#757575';
    }
    
    const rimLineWidth = 8;

    // 1. ЩИТ (Backboard)
    if (h.type === HOOP_TYPE.BACKBOARD) {
        ctx.save();
        const boardX = (HOOP_RADIUS + 15) * h.backboardSide;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; 
        ctx.lineWidth = 2;
        const bw = 12; const bh = 85; 
        ctx.fillRect(boardX - (bw/2), -bh - 10, bw, bh); 
        ctx.strokeRect(boardX - (bw/2), -bh - 10, bw, bh);
        ctx.beginPath(); ctx.moveTo(HOOP_RADIUS * h.backboardSide * 0.5, 0); ctx.lineTo(boardX, -25); ctx.stroke();
        ctx.restore();
    }

    // 2. СЕТКА (Net)
    ctx.strokeStyle = 'rgba(158, 158, 158, 0.3)'; 
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const topW = HOOP_RADIUS;
    const botW = HOOP_RADIUS * 0.6;
    const netH = 55;
    ctx.beginPath();
    for(let i = 0; i <= 6; i++) {
        let x1 = -topW + (topW * 2 * i / 6);
        let x2 = -botW + (botW * 2 * i / 6);
        ctx.moveTo(x1, 0);
        ctx.quadraticCurveTo(x1 * 0.9, netH * 0.5, x2, netH); 
    }
    ctx.moveTo(-botW, netH); ctx.lineTo(botW, netH); 
    ctx.stroke();

    // 3. ЗАДНЯЯ ЧАСТЬ ОБОДА
    if (h.type === HOOP_TYPE.SPIKED) {
        drawSpikes(ctx, true); 
    }

    ctx.strokeStyle = rimColorDark;
    ctx.lineWidth = rimLineWidth;
    ctx.beginPath();
    ctx.ellipse(0, 0, HOOP_RADIUS, HOOP_RADIUS * 0.35, Math.PI, Math.PI * 2, false); 
    ctx.stroke();

    ctx.restore();
}

export function drawHoopFrontElements(ctx, h, isNextHoop) {
    if(h.scale <= 0) return;
    
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.scale, h.scale);

    let rimColor;
    // Цвет передней части обода
    if (h.type === HOOP_TYPE.SPIKED) {
        rimColor = '#546E7A'; 
    } else if (h.type === HOOP_TYPE.MOVING) {
        rimColor = '#00BCD4'; // Bright Cyan (Tech style)
    } else {
        rimColor = isNextHoop ? '#FF5722' : '#BDBDBD';
    }
    const rimLineWidth = 8;

    // 1. ПЕРЕДНИЕ ШИПЫ
    if (h.type === HOOP_TYPE.SPIKED) {
        drawSpikes(ctx, false); 
    }

    // 2. ПЕРЕДНЯЯ ЧАСТЬ ОБОДА
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = rimLineWidth;
    ctx.beginPath();
    ctx.ellipse(0, 0, HOOP_RADIUS, HOOP_RADIUS * 0.35, 0, 0, Math.PI); 
    ctx.stroke();

    // 3. ДЕТАЛИ ДЛЯ TECH STYLE (Заклепки)
    if (h.type === HOOP_TYPE.MOVING) {
        ctx.fillStyle = '#E0F7FA'; // Почти белые заклепки
        [-0.8, 0, 0.8].forEach(t => {
            const bx = Math.cos(t) * HOOP_RADIUS;
            const by = Math.sin(t) * (HOOP_RADIUS * 0.35);
            ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2); ctx.fill();
        });
    }

    ctx.restore();
}

function drawSpikes(ctx, isBackLayer) {
    const spikeCountTotal = 10; 
    const spikeLen = 16; 
    const spikeWidth = 0.25; 

    const colorFill = isBackLayer ? '#B71C1C' : '#FF5252'; 
    const colorStroke = isBackLayer ? '#212121' : '#B71C1C';

    for(let i = 0; i < spikeCountTotal; i++) {
        const angle = (i / spikeCountTotal) * Math.PI * 2;
        
        let isVisible = false;
        if (isBackLayer) {
            if (angle > Math.PI + 0.1 && angle < Math.PI * 2 - 0.1) isVisible = true;
        } else {
            if (angle > 0.1 && angle < Math.PI - 0.1) isVisible = true;
        }

        if (isVisible) {
            const bx1 = Math.cos(angle - spikeWidth/2) * HOOP_RADIUS;
            const by1 = Math.sin(angle - spikeWidth/2) * (HOOP_RADIUS * 0.35);
            const bx2 = Math.cos(angle + spikeWidth/2) * HOOP_RADIUS;
            const by2 = Math.sin(angle + spikeWidth/2) * (HOOP_RADIUS * 0.35);
            const tipX = Math.cos(angle) * (HOOP_RADIUS + spikeLen);
            const tipY = Math.sin(angle) * ((HOOP_RADIUS * 0.35) + spikeLen);

            ctx.fillStyle = colorFill;
            ctx.strokeStyle = colorStroke;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(bx1, by1);
            ctx.lineTo(tipX, tipY); 
            ctx.lineTo(bx2, by2);
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
        }
    }
}

