import { MAX_PULL_DISTANCE, DRAG_POWER, GRAVITY, BALL_RADIUS, HOOP_RADIUS, HOOP_TYPE, OBSTACLE_TYPE } from './config.js';
import { getSkinTexture } from './skin-loader.js';

export function drawGame(ctx, state) {
    ctx.clearRect(0, 0, state.width, state.height);
    renderBackground(ctx, state);
    const shake = getShakeOffset(state);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    ctx.save();
    ctx.translate(0, state.cameraY);
    renderEffects(ctx, state, 'back');
    state.hoops.forEach((h, i) => {
        const isNextHoop = (i === state.currentHoopIndex + 1);
        renderHoop(ctx, h, isNextHoop, 'back');
    });
    renderParticles(ctx, state, 'trail');
    renderBall(ctx, state);
    state.hoops.forEach((h, i) => {
        const isNextHoop = (i === state.currentHoopIndex + 1);
        renderHoop(ctx, h, isNextHoop, 'front');
    });
    renderParticles(ctx, state, 'front');
    renderEffects(ctx, state, 'front');
    ctx.restore();
    ctx.restore();
}

let noiseCanvas = null;

function renderBackground(ctx, state) {
    const w = state.width;
    const h = state.height;
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#3f4343');
    bg.addColorStop(0.5, '#323535');
    bg.addColorStop(1, '#262727');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const light = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.2, h * 0.9);
    light.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    light.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)');
    light.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.2, w * 0.5, h * 0.5, h * 0.75);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    if (!noiseCanvas) {
        noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = 128;
        noiseCanvas.height = 128;
        const nctx = noiseCanvas.getContext('2d');
        const img = nctx.createImageData(noiseCanvas.width, noiseCanvas.height);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = 160 + Math.random() * 95;
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = 18;
        }
        nctx.putImageData(img, 0, 0);
    }
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.drawImage(noiseCanvas, 0, 0, w, h);
    ctx.restore();
}

function getShakeOffset(state) {
    if (!state.effects || state.effects.shakeFrames <= 0) return { x: 0, y: 0 };
    const duration = state.effects.shakeDuration || 1;
    const t = Math.max(0, state.effects.shakeFrames / duration);
    const amp = (state.effects.shakeStrength || 0) * t;
    return {
        x: (Math.random() - 0.5) * 2 * amp,
        y: (Math.random() - 0.5) * 2 * amp
    };
}

function renderHoop(ctx, h, isNextHoop, layer) {
    if (h.scale <= 0) return;
    h.renderScale = getHoopScale(h);
    if (layer === 'back') {
        renderHoopShadow(ctx, h);
        if (h.type === HOOP_TYPE.MOVING && h.scale > 0.5) {
            drawHoopRail(ctx, h);
        }
        drawHoopBackElements(ctx, h, isNextHoop);
        if (h.hasStar && h.scale > 0.3) {
            drawStarAboveHoop(ctx, h);
        }
    } else {
        drawHoopFrontElements(ctx, h, isNextHoop);
    }
}

function renderHoopShadow(ctx, h) {
    const scale = h.renderScale || h.scale;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(h.x, h.y + 20, HOOP_RADIUS * 0.95 * scale, HOOP_RADIUS * 0.28 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function renderBall(ctx, state) {
    if (!state.ball.visible) return;
    const scale = getBallScale(state);
    const r = BALL_RADIUS * scale;
    const trailColor = state.shop.currentTrailColor || '#FF5722';

    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(state.ball.x, state.ball.y + r * 0.85, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = hexToRgba(trailColor, 0.6);
    ctx.shadowBlur = 18;
    drawSkin(ctx, state.ball.x, state.ball.y, r, state.ball.angle, state.shop.activeSkin);
    ctx.restore();

    ctx.save();
    ctx.translate(state.ball.x, state.ball.y);
    ctx.rotate(state.ball.angle);
    const shade = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.2, 0, 0, r);
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    shade.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function renderParticles(ctx, state, layer) {
    if (layer === 'trail') {
        if (!state.ball.isSitting && state.ball.visible && state.ballTrail.length > 1) {
            const combo = state.comboLevel || 0;
            if (combo <= 0) return;
            const trailColor = state.shop.currentTrailColor || '#FF5722';
            const trailAccent = state.shop.currentTrailAccent || trailColor;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const len = state.ballTrail.length;
            for (let i = 0; i < len; i++) {
                const pos = state.ballTrail[i];
                const ratio = i / (len - 1);
                const alpha = combo === 2 ? 0.16 + ratio * 0.5 : 0.04 + ratio * 0.18;
                const size = BALL_RADIUS * (combo === 2 ? 0.22 + ratio * 0.65 : 0.14 + ratio * 0.45);
                const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size);
                grad.addColorStop(0, hexToRgba(trailColor, alpha));
                grad.addColorStop(1, hexToRgba(trailColor, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
                ctx.fill();
                if (combo === 2 && ratio > 0.55) {
                    ctx.fillStyle = hexToRgba(trailAccent, alpha * 0.9);
                    ctx.beginPath();
                    ctx.arc(pos.x + (Math.random() - 0.5) * 6, pos.y + (Math.random() - 0.5) * 6, size * 0.38, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.restore();
        }
        return;
    }

    state.particles.forEach(p => {
        if (p.type === 'dot') {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'spark') {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = p.life;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
            grad.addColorStop(0, hexToRgba(p.color, 0.9));
            grad.addColorStop(1, hexToRgba(p.color, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (p.type === 'text') {
            // Не рисуем если задержка ещё не прошла
            if (p.delay > 0) {
                return;
            }
            
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.textAlign = 'center';
            const fontSize = p.fontSize || 24;
            ctx.font = `bold ${fontSize}px Arial`;
            if (p.flameIntensity > 0) {
                ctx.fillStyle = '#FF3333';
                ctx.shadowColor = '#FFD700';
                let blur = p.flameIntensity >= 5 ? 50 : p.flameIntensity * 10 - 5;
                ctx.shadowBlur = Math.max(5, blur);
            } else if (p.color) {
                // Кастомный цвет (бонус) - без свечения
                ctx.fillStyle = p.color;
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
            }
            ctx.fillText(p.text, p.x, p.y);
            ctx.restore();
        }
    });
    ctx.globalAlpha = 1;
}

function renderEffects(ctx, state, layer) {
    if (layer === 'back') {
        if (state.currentObstacle && state.currentObstacle.type === OBSTACLE_TYPE.WIND) {
            const left = state.currentObstacle.x - state.currentObstacle.w / 2;
            const top = state.currentObstacle.y - state.currentObstacle.h / 2;
            state.currentObstacle.streaks.forEach(s => {
                ctx.save();
                ctx.globalAlpha = s.alpha;
                ctx.fillStyle = '#CCCCCC';
                ctx.beginPath();
                ctx.rect(left + s.x, top + s.y, s.w, 2);
                ctx.fill();
                ctx.restore();
            });
        }

        if (state.isDragging && state.ball.isSitting && state.ball.visible) {
            let dx = state.dragStart.x - state.dragCurrent.x;
            let dy = state.dragStart.y - state.dragCurrent.y;
            let dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > MAX_PULL_DISTANCE) {
                const ratio = MAX_PULL_DISTANCE / dist;
                dx *= ratio; dy *= ratio;
            }

            const trailColor = state.shop.currentTrailColor || '#FF5722';
            let sx = state.ball.x;
            let sy = state.ball.y;
            let svx = dx * DRAG_POWER;
            let svy = dy * DRAG_POWER;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for(let i=0; i<10; i++) {
                sx += svx * 3.5;
                sy += svy * 3.5;
                svy += GRAVITY * 3.5;

                if (sx < BALL_RADIUS) { sx = BALL_RADIUS; svx = -svx * 0.6; } 
                else if (sx > state.width - BALL_RADIUS) { sx = state.width - BALL_RADIUS; svx = -svx * 0.6; }

                const size = 2.2 + i * 0.15;
                const alpha = 0.25 + i * 0.05;
                const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 2.2);
                grad.addColorStop(0, hexToRgba(trailColor, alpha));
                grad.addColorStop(1, hexToRgba(trailColor, 0));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(sx, sy, size * 2.2, 0, Math.PI*2); 
                ctx.fill();
            }
            ctx.restore();
        }
    } else {
        if (state.effects && state.effects.hitFlashes.length > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            state.effects.hitFlashes.forEach(f => {
                const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
                grad.addColorStop(0, `rgba(255,255,255,${0.9 * f.life})`);
                grad.addColorStop(0.5, `rgba(255,210,140,${0.6 * f.life})`);
                grad.addColorStop(1, `rgba(255,210,140,0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }
    }
}

function getBallScale(state) {
    let scale = 1;
    if (state.effects) {
        if (state.effects.ballKickDuration > 0) {
            const t = Math.min(1, state.effects.ballKickTime / state.effects.ballKickDuration);
            scale *= 1 + Math.sin(t * Math.PI) * 0.08;
        }
        if (state.effects.ballLandDuration > 0) {
            const t = Math.min(1, state.effects.ballLandTime / state.effects.ballLandDuration);
            scale *= 1 - Math.sin(t * Math.PI) * 0.06;
        }
    }
    return scale;
}

function getHoopScale(h) {
    if (h.bounceDuration > 0 && h.bounceTime !== undefined) {
        const t = Math.min(1, h.bounceTime / h.bounceDuration);
        return h.scale * (1 + Math.sin(t * Math.PI) * 0.15);
    }
    return h.scale;
}

export function drawSkin(ctx, x, y, r, angle, skinId) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Пробуем использовать текстуру
    const texture = getSkinTexture(skinId);
    if (texture && texture.complete) {
        // Рисуем текстуру как круглую маску
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Растягиваем текстуру на весь круг с заполнением
        // Учитываем прозрачные поля по краям
        const fillRatio = 1.0; // 1.0 = 100% заполнение
        const drawSize = r * 2 * fillRatio;
        
        ctx.drawImage(texture, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
        // Резерв: рисуем процедурно
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
    gradient.addColorStop(0, '#FFD08A'); 
    gradient.addColorStop(1, '#FF7A2E'); 
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
    ctx.strokeStyle = '#2b1408'; ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.4, 0, 0, r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, r * 0.4, r, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.65, r, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#B54A1D'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawWatermelon(ctx, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); 
    const base = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    base.addColorStop(0, '#B6FF9E');
    base.addColorStop(1, '#2BCB6B');
    ctx.fillStyle = base; ctx.fill(); ctx.clip();
    ctx.fillStyle = '#0F6B2C'; 
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
    ctx.strokeStyle = '#0F6B2C'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawZombie(ctx, r) {
    const gradient = ctx.createRadialGradient(-r/3, -r/3, r/4, 0, 0, r);
    gradient.addColorStop(0, '#B8FFD9'); gradient.addColorStop(1, '#42D9B8'); 
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
    function drawStaticEye(cx, cy, radius) {
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#008A7A'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(cx + radius*0.3, cy, radius * 0.3, 0, Math.PI*2); ctx.fill();
    }
    drawStaticEye(-r * 0.35, -r * 0.2, r * 0.32);
    drawStaticEye(r * 0.4, -r * 0.25, r * 0.22);
    ctx.strokeStyle = '#3E1E16'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.4); ctx.quadraticCurveTo(0, r * 0.6, r * 0.4, r * 0.35); ctx.stroke();
    ctx.lineWidth = r * 0.05; const stitchY = r * 0.45; const stitchX = [-r * 0.2, 0, r * 0.2];
    stitchX.forEach(x => { ctx.beginPath(); ctx.moveTo(x, stitchY - (r*0.1)); ctx.lineTo(x, stitchY + (r*0.1)); ctx.stroke(); });
    ctx.strokeStyle = '#008A7A'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.5); ctx.lineTo(-r * 0.4, -r * 0.7); ctx.stroke();
}

function drawCosmic(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#B36BFF');
    gradient.addColorStop(0.6, '#7A4CFF');
    gradient.addColorStop(1, '#2D5BFF');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawNeon(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#E4FFFF');
    gradient.addColorStop(0.5, '#00F5FF');
    gradient.addColorStop(1, '#0076A3');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawGalaxy(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#F0C6FF');
    gradient.addColorStop(0.4, '#B000FF');
    gradient.addColorStop(1, '#3E0C7A');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 120, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawGolden(ctx, r) {
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#FFF6C2');
    gradient.addColorStop(0.5, '#FFD34D');
    gradient.addColorStop(1, '#FF9F1A');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 210, 90, 0.9)';
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

function getHoopPalette(h, isNextHoop) {
    if (h.type === HOOP_TYPE.SPIKED) {
        return { base: '#FF6B6B', dark: '#B71C1C', glow: 'rgba(255, 90, 90, 0.7)' };
    }
    if (h.type === HOOP_TYPE.MOVING) {
        return { base: '#2FE4FF', dark: '#007C8A', glow: 'rgba(47, 228, 255, 0.7)' };
    }
    if (isNextHoop) {
        return { base: '#FF7A3D', dark: '#C64B1A', glow: 'rgba(255, 130, 80, 0.7)' };
    }
    return { base: '#C6CCD2', dark: '#6B747B', glow: 'rgba(200, 210, 220, 0.55)' };
}

// --- HOOP RENDERING ---

function drawHoopBackElements(ctx, h, isNextHoop) {
    if(h.scale <= 0) return;
    
    ctx.save();
    ctx.translate(h.x, h.y);
    const scale = h.renderScale || h.scale;
    ctx.scale(scale, scale);

    const palette = getHoopPalette(h, isNextHoop);
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

    const rimGradient = ctx.createLinearGradient(0, -HOOP_RADIUS * 0.35, 0, HOOP_RADIUS * 0.35);
    rimGradient.addColorStop(0, palette.base);
    rimGradient.addColorStop(1, palette.dark);
    ctx.strokeStyle = rimGradient;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 10;
    ctx.lineWidth = rimLineWidth;
    ctx.beginPath();
    ctx.ellipse(0, 0, HOOP_RADIUS, HOOP_RADIUS * 0.35, Math.PI, Math.PI * 2, false); 
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = rimLineWidth * 0.8;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, HOOP_RADIUS * 0.98, HOOP_RADIUS * 0.33, Math.PI, Math.PI * 2, false); 
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
}

export function drawHoopFrontElements(ctx, h, isNextHoop) {
    if(h.scale <= 0) return;
    
    ctx.save();
    ctx.translate(h.x, h.y);
    const scale = h.renderScale || h.scale;
    ctx.scale(scale, scale);

    const palette = getHoopPalette(h, isNextHoop);
    const rimLineWidth = 8;

    // 1. ПЕРЕДНИЕ ШИПЫ
    if (h.type === HOOP_TYPE.SPIKED) {
        drawSpikes(ctx, false); 
    }

    // 2. ПЕРЕДНЯЯ ЧАСТЬ ОБОДА
    const rimGradient = ctx.createLinearGradient(0, -HOOP_RADIUS * 0.35, 0, HOOP_RADIUS * 0.35);
    rimGradient.addColorStop(0, palette.base);
    rimGradient.addColorStop(1, palette.dark);
    ctx.strokeStyle = rimGradient;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 12;
    ctx.lineWidth = rimLineWidth;
    ctx.beginPath();
    ctx.ellipse(0, 0, HOOP_RADIUS, HOOP_RADIUS * 0.35, 0, 0, Math.PI); 
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.lineWidth = rimLineWidth * 0.75;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, HOOP_RADIUS * 0.98, HOOP_RADIUS * 0.33, 0, 0, Math.PI); 
    ctx.stroke();
    ctx.shadowBlur = 0;

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

