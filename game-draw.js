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
            case 'case_cherry':     drawCaseCherry(ctx, r);     break;
            case 'case_moon':       drawCaseMoon(ctx, r);       break;
            case 'case_wood':       drawCaseWood(ctx, r);       break;
            case 'case_slime':      drawCaseSlime(ctx, r);      break;
            case 'case_strawberry': drawCaseStrawberry(ctx, r); break;
            case 'case_earth':      drawCaseEarth(ctx, r);      break;
            case 'case_prism':      drawCasePrism(ctx, r);      break;
            case 'case_demon':      drawCaseDemon(ctx, r);      break;
            case 'case_portal':     drawCasePortal(ctx, r);     break;
            case 'case_dragon':     drawCaseDragon(ctx, r);     break;
            case 'basketball':
            default:
                drawBasketball(ctx, r);
                break;
        }
    }

    ctx.restore();
}

// --- CASE SKIN DRAWING FUNCTIONS ---

function drawCaseCherry(ctx, r) {
    // === ВИШНЯ — глянцевый тёмно-красный шар ===
    const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
    gradient.addColorStop(0, '#FF6688');
    gradient.addColorStop(0.35, '#CC1133');
    gradient.addColorStop(0.75, '#880022');
    gradient.addColorStop(1, '#330008');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Черешок
    ctx.strokeStyle = '#2A5500';
    ctx.lineWidth = r * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.85);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.3, r * 0.6, -r * 0.9);
    ctx.stroke();

    // Листик
    ctx.fillStyle = '#3A7700';
    ctx.beginPath();
    ctx.ellipse(r * 0.55, -r * 1.05, r * 0.18, r * 0.09, -0.8, 0, Math.PI * 2);
    ctx.fill();

    // Блик
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.2, r * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(r * 0.18, r * 0.22, r * 0.1, r * 0.05, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180,0,30,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawCaseMoon(ctx, r) {
    // === ЛУНА — серый шар с кратерами ===
    const gradient = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
    gradient.addColorStop(0, '#DDDDDD');
    gradient.addColorStop(0.5, '#999999');
    gradient.addColorStop(1, '#444444');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Кратеры
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    const craters = [
        [-r*0.35, r*0.3, r*0.16], [r*0.3, r*0.2, r*0.12],
        [-r*0.5, -r*0.3, r*0.1], [r*0.2, -r*0.5, r*0.09],
        [r*0.5, -r*0.2, r*0.08], [-r*0.1, r*0.55, r*0.07],
    ];
    craters.forEach(([cx, cy, cr]) => {
        const cg = ctx.createRadialGradient(cx - cr*0.3, cy - cr*0.3, 0, cx, cy, cr);
        cg.addColorStop(0, 'rgba(80,80,80,0.7)');
        cg.addColorStop(0.7, 'rgba(60,60,60,0.5)');
        cg.addColorStop(1, 'rgba(160,160,160,0.3)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.32, r * 0.18, r * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100,100,100,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawCaseWood(ctx, r) {
    // === ДЕРЕВО — срез дерева с кольцами ===
    const gradient = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
    gradient.addColorStop(0, '#D28A4A');
    gradient.addColorStop(0.3, '#B86E2E');
    gradient.addColorStop(0.6, '#8B4A1A');
    gradient.addColorStop(1, '#4A2008');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Годовые кольца
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    const rings = [0.18, 0.32, 0.47, 0.62, 0.76, 0.88];
    rings.forEach(ratio => {
        ctx.strokeStyle = `rgba(60,25,5,${0.25 + ratio * 0.2})`;
        ctx.lineWidth = r * 0.025;
        ctx.beginPath();
        ctx.ellipse(r * 0.04, r * 0.03, r * ratio, r * ratio * 0.92, 0.15, 0, Math.PI * 2);
        ctx.stroke();
    });
    // Радиальные трещинки
    ctx.strokeStyle = 'rgba(60,25,5,0.2)';
    ctx.lineWidth = r * 0.018;
    [[0.1, 0.9, 0.2, 0.4], [-0.15, 0.85, -0.4, 0.3], [0.05, -0.9, 0.1, -0.4]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(r*x1, r*y1); ctx.lineTo(r*x2, r*y2); ctx.stroke();
    });
    ctx.restore();

    ctx.fillStyle = 'rgba(255,220,160,0.7)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.3, r * 0.18, r * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(80,35,10,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawCaseSlime(ctx, r) {
    // === СЛИЗЬ — полупрозрачный зелёный с пузырями ===
    const gradient = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    gradient.addColorStop(0, '#AAFFAA');
    gradient.addColorStop(0.4, '#44DD44');
    gradient.addColorStop(0.75, '#118811');
    gradient.addColorStop(1, '#044404');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Внутреннее свечение
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const innerGlow = ctx.createRadialGradient(r*0.15, r*0.1, 0, r*0.15, r*0.1, r*0.45);
    innerGlow.addColorStop(0, 'rgba(150,255,150,0.35)');
    innerGlow.addColorStop(1, 'rgba(0,200,0,0)');
    ctx.fillStyle = innerGlow;
    ctx.fillRect(-r, -r, r*2, r*2);

    // Пузыри
    ctx.globalCompositeOperation = 'source-over';
    [[r*0.3, -r*0.25, r*0.12], [-r*0.35, r*0.3, r*0.09], [r*0.45, r*0.35, r*0.07], [-r*0.15, -r*0.5, r*0.06]].forEach(([bx, by, br]) => {
        ctx.strokeStyle = 'rgba(200,255,200,0.6)';
        ctx.lineWidth = r * 0.03;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath(); ctx.arc(bx - br*0.4, by - br*0.4, br*0.2, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.18, r * 0.08, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,180,0,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,255,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawCaseStrawberry(ctx, r) {
    // === КЛУБНИКА — красная с семечками ===
    const gradient = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r);
    gradient.addColorStop(0, '#FF8899');
    gradient.addColorStop(0.4, '#EE1133');
    gradient.addColorStop(0.8, '#AA0022');
    gradient.addColorStop(1, '#550011');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Семечки
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    const seeds = [
        [0, -r*0.4], [-r*0.35, -r*0.15], [r*0.35, -r*0.1],
        [-r*0.2, r*0.25], [r*0.25, r*0.2], [0, r*0.45],
        [-r*0.45, r*0.1], [r*0.45, r*0.05], [-r*0.1, -r*0.6],
    ];
    seeds.forEach(([sx, sy]) => {
        ctx.fillStyle = '#FFEE88';
        ctx.strokeStyle = '#CC8800';
        ctx.lineWidth = r * 0.015;
        ctx.beginPath();
        ctx.ellipse(sx, sy, r * 0.055, r * 0.038, 0.3, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
    });
    ctx.restore();

    // Листики сверху
    ctx.fillStyle = '#2A7700';
    [[-0.25, -1.0, -0.5], [0, -1.05, 0], [0.25, -1.0, 0.5]].forEach(([lx, ly, rot]) => {
        ctx.save();
        ctx.translate(r * lx, r * ly);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.12, r * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.27, -r * 0.3, r * 0.19, r * 0.08, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180,0,30,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawCaseEarth(ctx, r) {
    // === ЗЕМЛЯ — голубая планета с материками ===
    const gradient = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
    gradient.addColorStop(0, '#88CCFF');
    gradient.addColorStop(0.4, '#2277DD');
    gradient.addColorStop(0.8, '#0044AA');
    gradient.addColorStop(1, '#001840');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Материки
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#3A9922';
    // Северный материк
    ctx.beginPath();
    ctx.moveTo(-r*0.5, -r*0.5);
    ctx.bezierCurveTo(-r*0.2, -r*0.65, r*0.3, -r*0.55, r*0.4, -r*0.2);
    ctx.bezierCurveTo(r*0.5, r*0.05, r*0.2, r*0.1, 0, -r*0.05);
    ctx.bezierCurveTo(-r*0.25, -r*0.15, -r*0.45, -r*0.3, -r*0.5, -r*0.5);
    ctx.fill();
    // Южный материк
    ctx.beginPath();
    ctx.moveTo(-r*0.3, r*0.25);
    ctx.bezierCurveTo(-r*0.1, r*0.15, r*0.25, r*0.2, r*0.35, r*0.45);
    ctx.bezierCurveTo(r*0.15, r*0.6, -r*0.2, r*0.55, -r*0.3, r*0.25);
    ctx.fill();
    // Атмосфера
    ctx.globalAlpha = 0.2;
    const atmo = ctx.createRadialGradient(0, 0, r*0.85, 0, 0, r);
    atmo.addColorStop(0, 'rgba(100,180,255,0)');
    atmo.addColorStop(1, 'rgba(100,200,255,0.8)');
    ctx.fillStyle = atmo;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.18, r * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(50,150,255,0.6)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(50,150,255,0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawCasePrism(ctx, r) {
    // === ПРИЗМА — шар со всеми цветами радуги ===
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();

    // Тёмная основа
    ctx.fillStyle = '#111122';
    ctx.fillRect(-r, -r, r*2, r*2);

    // Радужные полосы
    const colors = ['#FF0044', '#FF7700', '#FFEE00', '#44FF44', '#00CCFF', '#8844FF', '#FF44FF'];
    const stripeW = (r * 2) / colors.length;
    colors.forEach((c, i) => {
        const grd = ctx.createLinearGradient(-r + i*stripeW, 0, -r + (i+1)*stripeW, 0);
        grd.addColorStop(0, c);
        grd.addColorStop(1, colors[(i+1) % colors.length]);
        ctx.fillStyle = grd;
        ctx.fillRect(-r + i * stripeW, -r, stripeW + 1, r * 2);
    });

    // Стекловидный блик сверху
    const glass = ctx.createLinearGradient(0, -r, 0, 0);
    glass.addColorStop(0, 'rgba(255,255,255,0.55)');
    glass.addColorStop(0.4, 'rgba(255,255,255,0.1)');
    glass.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glass;
    ctx.fillRect(-r, -r, r*2, r);

    ctx.restore();

    // Блик
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.32, r * 0.22, r * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawCaseDemon(ctx, r) {
    // === ДЕМОН — тёмно-красный с трещинами и горящим глазом ===
    const gradient = ctx.createRadialGradient(0, -r*0.1, r*0.05, 0, 0, r);
    gradient.addColorStop(0, '#CC2200');
    gradient.addColorStop(0.4, '#880000');
    gradient.addColorStop(0.8, '#440000');
    gradient.addColorStop(1, '#110000');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Огненные трещины
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const demonCracks = [
        [[r*0.05, r*0.15], [r*0.35, -r*0.25], [r*0.6, -r*0.55]],
        [[r*0.05, r*0.15], [-r*0.3, -r*0.2], [-r*0.55, -r*0.5]],
        [[r*0.05, r*0.15], [r*0.15, r*0.5], [r*0.05, r*0.8]],
        [[r*0.05, r*0.15], [-r*0.4, r*0.4], [-r*0.6, r*0.6]],
    ];
    demonCracks.forEach(pts => {
        ctx.strokeStyle = 'rgba(255,120,0,0.8)';
        ctx.lineWidth = r * 0.04;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,50,0.5)';
        ctx.lineWidth = r * 0.015;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.stroke();
    });
    ctx.restore();

    // Горящий глаз в центре
    ctx.save();
    ctx.beginPath(); ctx.arc(0, r*0.1, r*0.28, 0, Math.PI*2); ctx.clip();
    const eyeGrad = ctx.createRadialGradient(0, r*0.1, 0, 0, r*0.1, r*0.28);
    eyeGrad.addColorStop(0, '#FFFFFF');
    eyeGrad.addColorStop(0.2, '#FFEE00');
    eyeGrad.addColorStop(0.5, '#FF6600');
    eyeGrad.addColorStop(1, '#CC0000');
    ctx.fillStyle = eyeGrad;
    ctx.beginPath(); ctx.arc(0, r*0.1, r*0.28, 0, Math.PI*2); ctx.fill();
    // Зрачок
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(0, r*0.1, r*0.07, r*0.14, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(200,0,0,0.8)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,50,0,0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawCasePortal(ctx, r) {
    // === ПОРТАЛ — чёрная дыра с цветным вихрем ===
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();

    // Чёрная основа
    ctx.fillStyle = '#000000';
    ctx.fillRect(-r, -r, r*2, r*2);

    // Вихрь — концентрические кольца с цветами
    ctx.globalCompositeOperation = 'lighter';
    const portalColors = [
        [r*0.95, 'rgba(120,0,255,0.5)'],
        [r*0.82, 'rgba(0,100,255,0.5)'],
        [r*0.68, 'rgba(0,200,255,0.5)'],
        [r*0.54, 'rgba(100,0,255,0.4)'],
        [r*0.4,  'rgba(200,0,255,0.4)'],
        [r*0.28, 'rgba(255,100,255,0.35)'],
    ];
    portalColors.forEach(([pr, color]) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = r * 0.1;
        ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI*2); ctx.stroke();
    });

    // Спиральные полосы
    ctx.strokeStyle = 'rgba(160,80,255,0.4)';
    ctx.lineWidth = r * 0.07;
    ctx.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) {
        const off = arm * Math.PI * 2 / 3;
        ctx.beginPath();
        let first = true;
        for (let t = 0; t <= 1; t += 0.03) {
            const angle = off + t * Math.PI * 2.5;
            const dist = t * r * 0.9;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();

    // Тёмное ядро
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r*0.25);
    core.addColorStop(0, 'rgba(0,0,0,1)');
    core.addColorStop(0.6, 'rgba(0,0,20,0.9)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, r*0.25, 0, Math.PI*2); ctx.fill();

    ctx.strokeStyle = 'rgba(120,0,255,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(150,0,255,0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawCaseDragon(ctx, r) {
    // === ДРАКОН — тёмный с чешуёй и светящимися глазами ===
    const gradient = ctx.createRadialGradient(-r*0.15, -r*0.2, r*0.05, 0, 0, r);
    gradient.addColorStop(0, '#5A2800');
    gradient.addColorStop(0.4, '#3A1500');
    gradient.addColorStop(0.8, '#1E0800');
    gradient.addColorStop(1, '#0A0200');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Чешуя (сетка из дуг)
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = 'rgba(180,80,0,0.35)';
    ctx.lineWidth = r * 0.025;
    const scaleSize = r * 0.22;
    for (let row = -5; row <= 5; row++) {
        for (let col = -5; col <= 5; col++) {
            const sx = col * scaleSize * 0.9 + (row % 2 === 0 ? scaleSize * 0.45 : 0);
            const sy = row * scaleSize * 0.7;
            if (Math.sqrt(sx*sx + sy*sy) < r * 1.1) {
                ctx.beginPath();
                ctx.arc(sx, sy + scaleSize * 0.3, scaleSize * 0.5, Math.PI * 1.1, Math.PI * 1.9);
                ctx.stroke();
            }
        }
    }
    ctx.restore();

    // Светящиеся глаза
    const eyePositions = [[-r*0.28, -r*0.2], [r*0.28, -r*0.2]];
    eyePositions.forEach(([ex, ey]) => {
        // Свечение
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const eyeGlow = ctx.createRadialGradient(ex, ey, 0, ex, ey, r*0.2);
        eyeGlow.addColorStop(0, 'rgba(255,140,0,0.7)');
        eyeGlow.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = eyeGlow;
        ctx.beginPath(); ctx.arc(ex, ey, r*0.2, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        // Белок
        ctx.fillStyle = '#FF8800';
        ctx.beginPath(); ctx.ellipse(ex, ey, r*0.1, r*0.07, 0, 0, Math.PI*2); ctx.fill();
        // Зрачок
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.ellipse(ex, ey, r*0.04, r*0.07, 0, 0, Math.PI*2); ctx.fill();
        // Блик
        ctx.fillStyle = 'rgba(255,255,200,0.8)';
        ctx.beginPath(); ctx.arc(ex - r*0.03, ey - r*0.03, r*0.025, 0, Math.PI*2); ctx.fill();
    });

    // Ноздри
    ctx.fillStyle = '#FF5500';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [[-r*0.1, r*0.05], [r*0.1, r*0.05]].forEach(([nx, ny]) => {
        const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, r*0.1);
        ng.addColorStop(0, 'rgba(255,100,0,0.6)');
        ng.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = ng;
        ctx.beginPath(); ctx.arc(nx, ny, r*0.1, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    ctx.strokeStyle = 'rgba(180,60,0,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,80,0,0.8)';
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
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
    // === ЖЕМЧУГ (Pearl) ===
    const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.2, '#F5EEFF');
    gradient.addColorStop(0.6, '#CCAAF0');
    gradient.addColorStop(1, '#8860C0');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Iridescent shimmer
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.2;
    const shim = ctx.createLinearGradient(-r * 0.8, -r * 0.4, r * 0.8, r * 0.4);
    shim.addColorStop(0, '#FF88FF');
    shim.addColorStop(0.3, '#88FFFF');
    shim.addColorStop(0.65, '#FFFFAA');
    shim.addColorStop(1, '#AAFFDD');
    ctx.fillStyle = shim;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    // Main elongated highlight
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.30, r * 0.22, r * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Secondary soft highlight
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(r * 0.2, r * 0.25, r * 0.13, r * 0.06, 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(190,150,230,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawZombie(ctx, r) {
    // === МРАМОР (Blue Marble) ===
    const gradient = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.08, 0, 0, r);
    gradient.addColorStop(0, '#88CCFF');
    gradient.addColorStop(0.4, '#3388DD');
    gradient.addColorStop(0.75, '#1155AA');
    gradient.addColorStop(1, '#061840');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient; ctx.fill();

    // Marble veins
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();

    ctx.strokeStyle = 'rgba(200,230,255,0.65)';
    ctx.lineWidth = r * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.55);
    ctx.bezierCurveTo(-r * 0.2, -r * 0.1, r * 0.1, r * 0.2, r * 0.65, r * 0.55);
    ctx.stroke();

    ctx.lineWidth = r * 0.04;
    ctx.strokeStyle = 'rgba(200,230,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.7);
    ctx.bezierCurveTo(r * 0.1, -r * 0.3, r * 0.3, 0, r * 0.55, -r * 0.4);
    ctx.stroke();

    ctx.lineWidth = r * 0.025;
    ctx.strokeStyle = 'rgba(180,215,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.2);
    ctx.bezierCurveTo(-r * 0.1, r * 0.35, r * 0.2, r * 0.5, r * 0.5, r * 0.65);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.1);
    ctx.bezierCurveTo(-r * 0.3, -r * 0.3, 0, r * 0.1, -r * 0.1, r * 0.5);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = 'rgba(100,180,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawCosmic(ctx, r) {
    // === ПЛАЗМА (Plasma Ball) ===
    const bg = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
    bg.addColorStop(0, '#BBDDFF');
    bg.addColorStop(0.25, '#4488FF');
    bg.addColorStop(0.6, '#1830A0');
    bg.addColorStop(1, '#030318');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();

    // Lightning arcs from center (fixed positions)
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';

    const arcs = [
        { pts: [[0, 0], [-r*0.25, -r*0.2], [-r*0.55, -r*0.5]], color: 'rgba(100,200,255,0.9)' },
        { pts: [[0, 0], [r*0.3, -r*0.15], [r*0.6, -r*0.45]], color: 'rgba(140,210,255,0.8)' },
        { pts: [[0, 0], [r*0.15, r*0.3], [r*0.35, r*0.65]], color: 'rgba(120,200,255,0.75)' },
        { pts: [[0, 0], [-r*0.35, r*0.2], [-r*0.6, r*0.4]], color: 'rgba(100,190,255,0.7)' },
        { pts: [[0, 0], [r*0.05, -r*0.4], [-r*0.15, -r*0.7]], color: 'rgba(160,220,255,0.6)' },
        { pts: [[0, 0], [r*0.2, r*0.1], [r*0.55, r*0.1]], color: 'rgba(180,230,255,0.5)', thin: true },
        { pts: [[0, 0], [-r*0.1, r*0.35], [-r*0.3, r*0.65]], color: 'rgba(160,220,255,0.45)', thin: true },
    ];

    arcs.forEach(arc => {
        ctx.strokeStyle = arc.color;
        ctx.lineWidth = arc.thin ? r * 0.025 : r * 0.04;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(80,180,255,0.8)';
        ctx.shadowBlur = arc.thin ? 4 : 8;
        ctx.beginPath();
        ctx.moveTo(arc.pts[0][0], arc.pts[0][1]);
        ctx.quadraticCurveTo(arc.pts[1][0], arc.pts[1][1], arc.pts[2][0], arc.pts[2][1]);
        ctx.stroke();
    });
    ctx.restore();

    // Bright center glow
    const centerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.32);
    centerGlow.addColorStop(0, 'rgba(255,255,255,1)');
    centerGlow.addColorStop(0.5, 'rgba(180,230,255,0.7)');
    centerGlow.addColorStop(1, 'rgba(80,160,255,0)');
    ctx.fillStyle = centerGlow;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(80,160,255,0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(80,160,255,0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawNeon(ctx, r) {
    // === ЛАВА (Lava Planet) ===
    const bg = ctx.createRadialGradient(-r * 0.2, -r * 0.15, r * 0.05, 0, 0, r);
    bg.addColorStop(0, '#FFD060');
    bg.addColorStop(0.3, '#FF6600');
    bg.addColorStop(0.7, '#CC2200');
    bg.addColorStop(1, '#3A0800');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();

    // Dark crack network
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();

    ctx.strokeStyle = 'rgba(15,3,0,0.85)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = r * 0.09;

    const cracks = [
        [[-r*0.05, -r*0.65], [-r*0.35, -r*0.2], [-r*0.6, r*0.05]],
        [[-r*0.05, -r*0.65], [r*0.25, -r*0.3], [r*0.65, r*0.05]],
        [[r*0.65, r*0.05], [r*0.35, r*0.35], [r*0.15, r*0.7]],
        [[-r*0.6, r*0.05], [-r*0.1, r*0.3], [r*0.15, r*0.7]],
        [[-r*0.35, -r*0.2], [-r*0.05, r*0.05], [r*0.25, -r*0.3]],
    ];

    cracks.forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.stroke();
    });

    // Glowing crack centers
    ctx.strokeStyle = 'rgba(255,190,50,0.6)';
    ctx.lineWidth = r * 0.025;
    cracks.slice(0, 3).forEach(pts => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.stroke();
    });

    // Volcanic dark patches
    ctx.fillStyle = 'rgba(10,2,0,0.7)';
    [[-r*0.25, r*0.45], [r*0.4, r*0.4], [-r*0.45, -r*0.4]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.ellipse(sx, sy, r * 0.14, r * 0.1, 0.5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();

    ctx.strokeStyle = 'rgba(255,120,0,0.85)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255,100,0,0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawGalaxy(ctx, r) {
    // === ТУМАННОСТЬ (Nebula / Galaxy Swirl) ===
    const bg = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    bg.addColorStop(0, '#FFCCFF');
    bg.addColorStop(0.15, '#EE88FF');
    bg.addColorStop(0.4, '#9922DD');
    bg.addColorStop(0.7, '#440088');
    bg.addColorStop(1, '#080012');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();

    // Spiral arms
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';

    for (let arm = 0; arm < 2; arm++) {
        const offset = arm * Math.PI;

        ctx.strokeStyle = 'rgba(230,150,255,0.45)';
        ctx.lineWidth = r * 0.13;
        ctx.lineCap = 'round';
        ctx.beginPath();
        let first = true;
        for (let t = 0; t <= 1; t += 0.025) {
            const angle = offset + t * Math.PI * 1.75;
            const dist = t * r * 0.82;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,200,255,0.5)';
        ctx.lineWidth = r * 0.055;
        ctx.beginPath();
        first = true;
        for (let t = 0; t <= 0.7; t += 0.025) {
            const angle = offset + t * Math.PI * 1.5;
            const dist = t * r * 0.6;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    ctx.restore();

    // Stars
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    [
        [-r*0.55, -r*0.4, 0.045], [r*0.5, -r*0.35, 0.035],
        [r*0.4, r*0.52, 0.04], [-r*0.5, r*0.35, 0.03],
        [r*0.2, -r*0.65, 0.025], [-r*0.25, r*0.6, 0.03],
        [r*0.65, r*0.15, 0.02],
    ].forEach(([sx, sy, sr]) => {
        ctx.beginPath(); ctx.arc(sx, sy, r * sr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    // Center core
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.28);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.4, 'rgba(255,180,255,0.8)');
    core.addColorStop(1, 'rgba(200,80,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = 'rgba(180,80,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(200,80,255,0.7)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawGolden(ctx, r) {
    // === КРИСТАЛЛ (Cut Gem Crystal) ===
    const bg = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r);
    bg.addColorStop(0, '#FFFFFF');
    bg.addColorStop(0.15, '#CCFFFF');
    bg.addColorStop(0.4, '#00BBCC');
    bg.addColorStop(0.75, '#006680');
    bg.addColorStop(1, '#001820');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();

    // Gem facets
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = r * 0.045;
    ctx.lineCap = 'round';
    [
        [[0, -r*0.9], [r*0.55, -r*0.05]],
        [[0, -r*0.9], [-r*0.55, -r*0.05]],
        [[r*0.55, -r*0.05], [r*0.55, r*0.65]],
        [[-r*0.55, -r*0.05], [-r*0.55, r*0.65]],
        [[r*0.55, r*0.65], [0, r*0.9]],
        [[-r*0.55, r*0.65], [0, r*0.9]],
        [[r*0.55, -r*0.05], [-r*0.55, -r*0.05]],
        [[r*0.55, r*0.65], [-r*0.55, r*0.65]],
        [[0, -r*0.9], [0, r*0.9]],
    ].forEach(([p1, p2]) => {
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    });

    // Facet shading
    ctx.fillStyle = 'rgba(200,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9); ctx.lineTo(-r * 0.55, -r * 0.05); ctx.lineTo(0, 0);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = 'rgba(0,200,220,0.07)';
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.05); ctx.lineTo(r * 0.55, r * 0.65); ctx.lineTo(0, 0);
    ctx.closePath(); ctx.fill();

    // Star burst highlight
    ctx.globalCompositeOperation = 'lighter';
    [0, Math.PI*0.5, Math.PI, Math.PI*1.5, Math.PI*0.25, Math.PI*0.75, Math.PI*1.25, Math.PI*1.75].forEach((angle, i) => {
        const len = i % 2 === 0 ? r * 0.55 : r * 0.28;
        const alpha = i % 2 === 0 ? 0.28 : 0.14;
        ctx.strokeStyle = `rgba(200,255,255,${alpha})`;
        ctx.lineWidth = r * (i % 2 === 0 ? 0.07 : 0.035);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
        ctx.stroke();
    });

    ctx.restore();

    // Main highlight spot
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.28, r * 0.18, r * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,200,230,0.75)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,210,240,0.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
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

