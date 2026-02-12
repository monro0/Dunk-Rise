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

    // 2. СЛОЙ 1: ЗАДНИЕ ЧАСТИ КОЛЕЦ (Щит, Сетка, Задняя дужка)
    state.hoops.forEach((h, i) => {
        const isNextHoop = (i === state.currentHoopIndex + 1);
        drawHoopBackElements(ctx, h, isNextHoop);
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

    // Линия прицеливания (только если мяч сидит)
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
            sx += svx * 2; sy += svy * 2; svy += GRAVITY * 2;
            if (sx < BALL_RADIUS) { sx = BALL_RADIUS; svx = -svx * 0.6; } 
            else if (sx > state.width - BALL_RADIUS) { sx = state.width - BALL_RADIUS; svx = -svx * 0.6; }
            ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI*2); ctx.fill();
        }
    }

    // Сам Мяч
    if (state.ball.visible) {
        drawSkin(ctx, state.ball.x, state.ball.y, BALL_RADIUS, state.ball.angle, state.shop.activeSkin);
    }

    // 4. СЛОЙ 3: ПЕРЕДНИЕ ЧАСТИ КОЛЕЦ (Передняя дужка)
    // Это создает иллюзию того, что мяч внутри
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

// --- PROCEDURAL SKINS IMPLEMENTATION ---

function drawBasketball(ctx, r) {
    // Gradient Base
    const gradient = ctx.createRadialGradient(-r / 3, -r / 3, r / 4, 0, 0, r);
    gradient.addColorStop(0, '#FFB74D'); 
    gradient.addColorStop(1, '#FF9800'); 
    
    ctx.beginPath(); 
    ctx.arc(0, 0, r, 0, Math.PI * 2); 
    ctx.fillStyle = gradient; 
    ctx.fill();

    // Black Lines
    ctx.strokeStyle = '#2e1a0f'; 
    ctx.lineWidth = r * 0.12; // Масштабируемая толщина
    ctx.lineCap = 'round';

    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.4, 0, 0, r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, r * 0.4, r, 0); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.65, r, 0, 0, Math.PI * 2); ctx.stroke();

    // Outline
    ctx.strokeStyle = '#BF360C'; 
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawWatermelon(ctx, r) {
    // 1. Base (Light Green)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#90EE90'; // Light Green
    ctx.fill();
    ctx.clip(); // Masking for stripes

    // 2. Organic Stripes
    ctx.fillStyle = '#1B5E20'; // Dark Green
    
    // Рисуем несколько полос
    const numStripes = 5;
    const stripeWidth = r * 0.4; 
    const step = (r * 2.5) / numStripes;
    
    for (let i = 0; i < numStripes; i++) {
        let startX = -r * 1.2 + (step * i);
        
        ctx.beginPath();
        // Начинаем сверху
        ctx.moveTo(startX, -r);
        
        // Рисуем волнистую линию вниз
        for (let y = -r; y <= r; y += 5) {
            // Используем синусоиду для органичности
            // phase shift зависит от i (индекса полосы), чтобы они были разными
            let wobble = Math.sin(y * 0.05 + i) * (r * 0.15); 
            // Добавляем искажение кривизны сферы (шире в центре)
            let sphereBulge = Math.cos(y / r * 1.5) * (r * 0.1);

            ctx.lineTo(startX + wobble + sphereBulge, y);
        }
        
        // Замыкаем полосу (идем обратно вверх с отступом ширины)
        for (let y = r; y >= -r; y -= 5) {
            let wobble = Math.sin(y * 0.05 + i) * (r * 0.15);
            let sphereBulge = Math.cos(y / r * 1.5) * (r * 0.1);
            ctx.lineTo(startX + stripeWidth + wobble + sphereBulge, y);
        }
        
        ctx.fill();
    }

    // 3. Texture dots (optional detail)
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for(let j=0; j<10; j++) {
        ctx.beginPath();
        ctx.arc((Math.random()-0.5)*r*1.5, (Math.random()-0.5)*r*1.5, r*0.05, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.restore();

    // 4. Outline
    ctx.strokeStyle = '#1B5E20'; 
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
}

function drawZombie(ctx, r) {
    // Base Skin (Pale Turquoise)
    const gradient = ctx.createRadialGradient(-r/3, -r/3, r/4, 0, 0, r);
    gradient.addColorStop(0, '#B2DFDB'); // Lighter
    gradient.addColorStop(1, '#80CBC4'); // Target Color
    
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();

    // Eyes Helper
    function drawStaticEye(cx, cy, radius) {
        // Sclera
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#00695C'; ctx.lineWidth = 1; ctx.stroke();
        
        // Pupil (Fixed direction - looking slightly right)
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(cx + radius*0.3, cy, radius * 0.3, 0, Math.PI*2); ctx.fill();
    }

    // Left Eye (Bigger) - Static Position relative to Radius
    drawStaticEye(-r * 0.35, -r * 0.2, r * 0.32);
    
    // Right Eye (Smaller)
    drawStaticEye(r * 0.4, -r * 0.25, r * 0.22);

    // Mouth (Stitched)
    ctx.strokeStyle = '#3E2723'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round';
    ctx.beginPath(); 
    ctx.moveTo(-r * 0.4, r * 0.4);
    ctx.quadraticCurveTo(0, r * 0.6, r * 0.4, r * 0.35);
    ctx.stroke();
    
    // Stitches
    ctx.lineWidth = r * 0.05;
    const stitchY = r * 0.45;
    const stitchX = [-r * 0.2, 0, r * 0.2];
    
    stitchX.forEach(x => {
        ctx.beginPath(); 
        ctx.moveTo(x, stitchY - (r*0.1)); 
        ctx.lineTo(x, stitchY + (r*0.1)); 
        ctx.stroke();
    });

    // Scar
    ctx.strokeStyle = '#00695C'; ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.moveTo(-r * 0.6, -r * 0.5); 
    ctx.lineTo(-r * 0.4, -r * 0.7); 
    ctx.stroke();
}

// --- SPLIT HOOP RENDERING (3D EFFECT) ---

// --- 3D HOOP RENDERING (Clean Shield + Juicy Spikes) ---

function drawHoopBackElements(ctx, h, isNextHoop) {
    if(h.scale <= 0) return;
    
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.scale, h.scale);

    // Цвета обода
    const rimColorDark = h.type === HOOP_TYPE.SPIKED ? '#37474F' : (isNextHoop ? '#D84315' : '#757575'); 
    const rimLineWidth = 8;

    // 1. ЩИТ (Backboard) - "Как было", но без оранжевого
    if (h.type === HOOP_TYPE.BACKBOARD) {
        ctx.save();
        const boardX = (HOOP_RADIUS + 15) * h.backboardSide;
        
        // Рисуем стойку (просто и чисто)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; 
        ctx.lineWidth = 2;
        
        const bw = 12; // Ширина стойки
        const bh = 85; // Высота
        
        // Сама палка
        ctx.fillRect(boardX - (bw/2), -bh - 10, bw, bh); 
        ctx.strokeRect(boardX - (bw/2), -bh - 10, bw, bh);
        
        // Крепление к кольцу (диагональная палка)
        ctx.beginPath(); 
        ctx.moveTo(HOOP_RADIUS * h.backboardSide * 0.5, 0); 
        ctx.lineTo(boardX, -25); 
        ctx.stroke();

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
        ctx.quadraticCurveTo(x1 * 0.9, netH * 0.5, x2, netH); // Легкий изгиб сетки
    }
    ctx.moveTo(-botW, netH); ctx.lineTo(botW, netH); // Низ сетки
    ctx.stroke();

    // 3. ЗАДНЯЯ ЧАСТЬ ОБОДА (Back Rim)
    
    // Если это ШИПЫ - рисуем задний ряд шипов
    if (h.type === HOOP_TYPE.SPIKED) {
        drawSpikes(ctx, true); // true = задний слой
    }

    ctx.strokeStyle = rimColorDark;
    ctx.lineWidth = rimLineWidth;
    ctx.beginPath();
    // Верхняя дуга эллипса
    ctx.ellipse(0, 0, HOOP_RADIUS, HOOP_RADIUS * 0.35, Math.PI, Math.PI * 2, false); 
    ctx.stroke();

    ctx.restore();
}

function drawHoopFrontElements(ctx, h, isNextHoop) {
    if(h.scale <= 0) return;
    
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(h.scale, h.scale);

    let rimColor;
    if (h.type === HOOP_TYPE.SPIKED) {
        rimColor = '#546E7A'; // Металлический цвет для шипованного кольца
    } else {
        rimColor = isNextHoop ? '#FF5722' : '#BDBDBD';
    }
    const rimLineWidth = 8;

    // 1. ПЕРЕДНИЕ ШИПЫ (если есть)
    // Мяч будет рисоваться ПОД ними, так как эта функция вызывается после отрисовки мяча
    if (h.type === HOOP_TYPE.SPIKED) {
        drawSpikes(ctx, false); // false = передний слой
    }

    // 2. ПЕРЕДНЯЯ ЧАСТЬ ОБОДА (Front Rim)
    ctx.strokeStyle = rimColor;
    ctx.lineWidth = rimLineWidth;
    ctx.beginPath();
    // Нижняя дуга эллипса
    ctx.ellipse(0, 0, HOOP_RADIUS, HOOP_RADIUS * 0.35, 0, 0, Math.PI); 
    ctx.stroke();

    ctx.restore();
}

// --- НОВАЯ ФУНКЦИЯ ОТРИСОВКИ СОЧНЫХ ШИПОВ ---
function drawSpikes(ctx, isBackLayer) {
    const spikeCountTotal = 10; 
    const spikeLen = 16; // Длинные шипы
    const spikeWidth = 0.25; // Ширина основания в радианах

    // Цвета шипов
    const colorFill = isBackLayer ? '#B71C1C' : '#FF5252'; // Темно-красный сзади, ярко-красный спереди
    const colorStroke = isBackLayer ? '#212121' : '#B71C1C';

    // Определяем диапазон углов для отрисовки
    // Back Layer: рисуем сверху (PI .. 2PI)
    // Front Layer: рисуем снизу (0 .. PI)
    const startAngle = isBackLayer ? Math.PI : 0;
    const endAngle = isBackLayer ? Math.PI * 2 : Math.PI;

    for(let i = 0; i < spikeCountTotal; i++) {
        const angle = (i / spikeCountTotal) * Math.PI * 2;
        
        // Проверяем видимость (с небольшим запасом, чтобы не обрезалось резко)
        let isVisible = false;
        if (isBackLayer) {
            if (angle > Math.PI + 0.1 && angle < Math.PI * 2 - 0.1) isVisible = true;
        } else {
            if (angle > 0.1 && angle < Math.PI - 0.1) isVisible = true;
        }

        if (isVisible) {
            // Координаты основания на эллипсе
            const bx1 = Math.cos(angle - spikeWidth/2) * HOOP_RADIUS;
            const by1 = Math.sin(angle - spikeWidth/2) * (HOOP_RADIUS * 0.35);
            
            const bx2 = Math.cos(angle + spikeWidth/2) * HOOP_RADIUS;
            const by2 = Math.sin(angle + spikeWidth/2) * (HOOP_RADIUS * 0.35);

            // Координаты острия (торчит наружу)
            const tipX = Math.cos(angle) * (HOOP_RADIUS + spikeLen);
            const tipY = Math.sin(angle) * ((HOOP_RADIUS * 0.35) + spikeLen);

            ctx.fillStyle = colorFill;
            ctx.strokeStyle = colorStroke;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.moveTo(bx1, by1);
            ctx.lineTo(tipX, tipY); // Пик
            ctx.lineTo(bx2, by2);
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
        }
    }
}
