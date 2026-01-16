document.addEventListener('DOMContentLoaded', () => {
    // --- TELEGRAM SETUP ---
    try {
        const tg = window.Telegram.WebApp;
        if (tg) {
            tg.ready();
            tg.expand();
        }
    } catch (e) {}

    // --- DOM ---
    const container = document.getElementById('game-container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreElement = document.getElementById('finalScore');
    const restartButton = document.getElementById('restartButton');

    // --- CONFIG ---
    const GRAVITY = 0.6;
    const DRAG_POWER = 0.16;
    const MAX_DRAG = 220;
    const BALL_RADIUS = 22;
    
    // [ИЗМЕНЕНИЕ 9] Увеличение размера кольца на 15% (было 40 -> стало 46)
    const HOOP_RADIUS = 46; 
    const HOOP_DIAMETER = HOOP_RADIUS * 2;
    const HOOP_MARGIN = 50; 

    // Типы колец
    const HOOP_TYPE = {
        NORMAL: 'normal',
        BACKBOARD: 'backboard', 
        MOVING: 'moving'        
    };

    // --- STATE ---
    let width, height;
    let score = 0;
    let isGameOver = false;
    let lastTime = 0;

    // [ИЗМЕНЕНИЕ 10] Переменные для комбо
    let swishCombo = 0;
    let shotTouchedRim = false; // Коснулся ли мяч дужки в текущем полете?

    let cameraY = 0;
    let cameraTargetY = 0;

    let ball = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, isSitting: true };
    let hoops = [];
    let particles = [];
    let currentHoopIndex = 0;

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragCurrent = { x: 0, y: 0 };

    // --- CORE ---

    function resize() {
        width = canvas.width = container.clientWidth;
        height = canvas.height = container.clientHeight;
    }

    function initGame() {
        resize();
        isGameOver = false;
        score = 0;
        
        // Сброс комбо
        swishCombo = 0;
        shotTouchedRim = false;

        updateScoreUI();
        gameOverScreen.classList.add('hidden');
        particles = [];
        cameraY = 0;
        cameraTargetY = 0;

        hoops = [];
        
        addHoop(width / 2, height * 0.75, HOOP_TYPE.NORMAL);
        spawnNewHoop(hoops[0]);

        currentHoopIndex = 0;
        resetBallToHoop(0);

        if (!lastTime) {
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    }

    function addHoop(x, y, type = HOOP_TYPE.NORMAL, backboardSide = 0) {
        hoops.push({
            x: x,
            y: y,
            type: type,
            backboardSide: backboardSide, 
            scale: 0, 
            targetScale: 1,
            moveSpeed: 1.5, 
            moveDir: Math.random() > 0.5 ? 1 : -1,
            points: type === HOOP_TYPE.NORMAL ? 1 : (type === HOOP_TYPE.BACKBOARD ? 2 : 3)
        });
    }

    function spawnNewHoop(prevHoop = null) {
        if (!prevHoop) prevHoop = hoops[hoops.length - 1];

        let type = HOOP_TYPE.NORMAL;
        
        if (prevHoop.type !== HOOP_TYPE.NORMAL) {
            type = HOOP_TYPE.NORMAL;
        } else {
            const rand = Math.random();
            if (score >= 10) {
                if (rand < 0.5) type = HOOP_TYPE.NORMAL;
                else if (rand < 0.75) type = HOOP_TYPE.BACKBOARD;
                else type = HOOP_TYPE.MOVING;
            } else if (score >= 5) {
                if (rand < 0.7) type = HOOP_TYPE.NORMAL;
                else type = HOOP_TYPE.BACKBOARD;
            }
        }

        const minH = height * 0.25; 
        const maxH = height * 0.45;
        const distY = minH + Math.random() * (maxH - minH);
        const newY = prevHoop.y - distY;

        const minShift = HOOP_DIAMETER * 1.1; 
        const maxShift = width * 0.6; 
        
        let possibleSides = [];
        if (prevHoop.x - minShift > HOOP_MARGIN) possibleSides.push('left');
        if (prevHoop.x + minShift < width - HOOP_MARGIN) possibleSides.push('right');
        if (possibleSides.length === 0) possibleSides = ['left', 'right'];

        const side = possibleSides[Math.floor(Math.random() * possibleSides.length)];
        let newX;
        let backboardSide = 0;

        if (side === 'left') {
            const leftLimit = Math.max(HOOP_MARGIN, prevHoop.x - maxShift);
            const rightLimit = prevHoop.x - minShift; 
            newX = leftLimit + Math.random() * (rightLimit - leftLimit);
            backboardSide = -1; 
        } else {
            const leftLimit = prevHoop.x + minShift;
            const rightLimit = Math.min(width - HOOP_MARGIN, prevHoop.x + maxShift);
            newX = leftLimit + Math.random() * (rightLimit - leftLimit);
            backboardSide = 1; 
        }

        if (type === HOOP_TYPE.BACKBOARD) {
            const safeDistance = HOOP_RADIUS + 25; 
            if (backboardSide === -1) {
                if (newX - safeDistance < 0) newX = safeDistance + 5; 
            } else {
                if (newX + safeDistance > width) newX = width - safeDistance - 5; 
            }
        }

        addHoop(newX, newY, type, backboardSide);

        if (hoops.length > 7) {
            hoops.shift();
            currentHoopIndex--;
        }
    }

    function resetBallToHoop(index) {
        if (!hoops[index]) return;
        const h = hoops[index];
        ball.x = h.x;
        ball.y = h.y;
        ball.vx = 0;
        ball.vy = 0;
        ball.isSitting = true;
        
        // Сброс флагов при ресете
        shotTouchedRim = false;
        
        cameraTargetY = -h.y + height * 0.7;
    }

    // --- LOOP ---

    function gameLoop(timestamp) {
        const dt = (timestamp - lastTime) / 16.67;
        lastTime = timestamp;

        if (!isGameOver) update(dt);
        draw();
        requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        cameraY += (cameraTargetY - cameraY) * 0.1;

        hoops.forEach(h => {
            if (h.scale < h.targetScale) h.scale += 0.08 * dt;

            if (h.type === HOOP_TYPE.MOVING) {
                h.x += h.moveSpeed * h.moveDir * dt;
                
                if (h.x > width - HOOP_MARGIN) {
                    h.x = width - HOOP_MARGIN;
                    h.moveDir = -1;
                } else if (h.x < HOOP_MARGIN) {
                    h.x = HOOP_MARGIN;
                    h.moveDir = 1;
                }
                
                if (ball.isSitting && hoops[currentHoopIndex] === h) {
                    ball.x = h.x;
                }
            }
        });

        if (!ball.isSitting) {
            ball.vy += GRAVITY * dt;
            ball.x += ball.vx * dt;
            ball.y += ball.vy * dt;
            ball.angle += ball.vx * 0.05 * dt;

            if (ball.x < BALL_RADIUS) {
                ball.x = BALL_RADIUS;
                ball.vx *= -0.6;
            } else if (ball.x > width - BALL_RADIUS) {
                ball.x = width - BALL_RADIUS;
                ball.vx *= -0.6;
            }

            let safeIndex = Math.max(0, currentHoopIndex - 1);
            let safeRing = hoops[safeIndex];
            if (safeRing && ball.y + cameraY > (safeRing.y + cameraY) + 350) {
                endGame();
            }

            checkCollisions(dt);
        } else {
            const h = hoops[currentHoopIndex];
            if (h && h.type !== HOOP_TYPE.MOVING) {
                ball.x += (h.x - ball.x) * 0.2 * dt;
                ball.y += (h.y - ball.y) * 0.2 * dt;
            } else if (h && h.type === HOOP_TYPE.MOVING) {
                ball.y += (h.y - ball.y) * 0.2 * dt;
            }
        }

        updateParticles(dt);
    }

    function checkCollisions(dt) {
        const indicesToCheck = [currentHoopIndex + 1, currentHoopIndex, currentHoopIndex - 1];

        indicesToCheck.forEach(idx => {
            if (idx >= 0 && idx < hoops.length) {
                let h = hoops[idx];
                
                const distToCenter = Math.abs(ball.x - h.x);
                const distY = Math.abs(ball.y - h.y);
                
                // Слабый магнетизм
                if (distToCenter < 15 && distY < 15) {
                     ball.x += (h.x - ball.x) * 0.05 * dt;
                }

                if (h.type === HOOP_TYPE.BACKBOARD) {
                    checkBackboardCollision(h);
                }

                checkRimCollision(h);

                // Попадание
                if (ball.vy > 0 && 
                    ball.y > h.y - 15 && 
                    ball.y < h.y + 25 &&
                    Math.abs(ball.x - h.x) < HOOP_RADIUS * 0.85
                ) {
                    if (idx > currentHoopIndex) {
                        handleScore(h);
                    } else {
                        recoverBall(idx);
                    }
                }
            }
        });
    }

    function checkBackboardCollision(h) {
        const boardW = 10;
        const boardH = 80;
        
        const boardX = h.x + (HOOP_RADIUS + 10) * h.backboardSide;
        const boardY = h.y - 40; 

        if (ball.y > boardY - boardH/2 && 
            ball.y < boardY + boardH/2 &&
            Math.abs(ball.x - boardX) < BALL_RADIUS + boardW/2) 
        {
            ball.vx = -h.backboardSide * Math.abs(ball.vx) * 0.8;
            if (Math.abs(ball.vx) < 2) {
                ball.vx = -h.backboardSide * 4;
            }
            ball.x = boardX - (h.backboardSide * (BALL_RADIUS + boardW/2 + 1));
        }
    }

    function checkRimCollision(h) {
        const rims = [h.x - HOOP_RADIUS, h.x + HOOP_RADIUS];
        rims.forEach(rx => {
            const dx = ball.x - rx;
            const dy = ball.y - h.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < BALL_RADIUS + 5) {
                // [ИЗМЕНЕНИЕ 10] Если коснулись обода, помечаем бросок как "грязный"
                // Но только если мы еще не сидим в кольце (чтобы не сбрасывать при спавне)
                if (!ball.isSitting) {
                    shotTouchedRim = true;
                }

                const nx = dx / dist;
                const ny = dy / dist;
                const vDotN = ball.vx * nx + ball.vy * ny;
                
                const bounceFactor = 0.4; 
                
                ball.vx -= (1 + bounceFactor) * vDotN * nx;
                ball.vy -= (1 + bounceFactor) * vDotN * ny;
                
                const overlap = (BALL_RADIUS + 5) - dist;
                ball.x += nx * overlap;
                ball.y += ny * overlap;
            }
        });
    }

    function handleScore(targetHoop) {
        const basePoints = targetHoop ? targetHoop.points : 1;
        let totalPoints = basePoints;
        let isSwish = false;

        // [ИЗМЕНЕНИЕ 10] Логика Swish Combo
        if (!shotTouchedRim) {
            // Чистый бросок!
            isSwish = true;
            const bonus = Math.pow(2, swishCombo); // 1, 2, 4, 8...
            totalPoints += bonus;
            
            // Текстовый эффект
            createFloatingText(ball.x, ball.y - 50, `SWISH! +${bonus}`, '#FFD700');
            if (swishCombo > 1) {
                createFloatingText(ball.x, ball.y - 80, `COMBO x${swishCombo}`, '#FF4081');
            }

            swishCombo++;
        } else {
            // Грязный бросок
            swishCombo = 0;
            createFloatingText(ball.x, ball.y - 50, `+${basePoints}`, '#FFFFFF');
        }

        score += totalPoints;

        updateScoreUI();
        createParticles(ball.x, ball.y, isSwish ? 40 : 20); // Больше частиц при Swish
        
        currentHoopIndex++;
        
        ball.isSitting = true;
        ball.vx = 0; ball.vy = 0;
        
        if (targetHoop.type !== HOOP_TYPE.MOVING) {
            ball.x = targetHoop.x;
        }
        ball.y = targetHoop.y;
        
        const h = hoops[currentHoopIndex];
        cameraTargetY = -h.y + height * 0.7;

        if (currentHoopIndex === hoops.length - 1) {
            spawnNewHoop();
        }
    }

    function recoverBall(index) {
        // [ИЗМЕНЕНИЕ 10] Сброс комбо при промахе/спасении
        swishCombo = 0;
        
        currentHoopIndex = index;
        ball.isSitting = true;
        ball.vx = 0; ball.vy = 0;
        const h = hoops[currentHoopIndex];
        
        if (h.type !== HOOP_TYPE.MOVING) {
             ball.x = h.x;
        }
        ball.y = h.y;

        cameraTargetY = -h.y + height * 0.7;
        createParticles(ball.x, ball.y, 10);
    }

    // --- DRAWING ---

    function draw() {
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(0, cameraY);

        if (isDragging && ball.isSitting) drawTrajectory();

        hoops.forEach((h, i) => drawHoopBack(h, i === currentHoopIndex));
        drawBall();
        hoops.forEach((h, i) => drawHoopFront(h, i === currentHoopIndex));
        drawParticles();
        drawFloatingTexts(); // Рисуем текст

        ctx.restore();
    }

    function drawTrajectory() {
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > MAX_DRAG) {
            const s = MAX_DRAG / dist;
            dx *= s; dy *= s; 
        }

        const vx = dx * DRAG_POWER;
        const vy = dy * DRAG_POWER;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        let sx = ball.x, sy = ball.y, svy = vy;
        
        for(let i=0; i<15; i++) {
            sx += vx * 2;
            sy += svy * 2;
            svy += GRAVITY * 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 4, 0, Math.PI*2);
            ctx.fill();
        }
    }

    function drawBall() {
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ball.angle);
        ctx.font = "45px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🏀", 0, 5);
        ctx.restore();
    }

    function drawHoopBack(h, active) {
        if(h.scale <= 0) return;
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.scale(h.scale, h.scale);
        
        if (h.type === HOOP_TYPE.BACKBOARD) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            
            const boardX = (HOOP_RADIUS + 10) * h.backboardSide;
            ctx.fillRect(boardX - 5, -80, 10, 80);
            ctx.strokeRect(boardX - 5, -80, 10, 80);
            
            ctx.beginPath();
            ctx.moveTo(HOOP_RADIUS * h.backboardSide, 0);
            ctx.lineTo(boardX, -20);
            ctx.stroke();
        }

        ctx.strokeStyle = active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-HOOP_RADIUS+10, 0);
        ctx.lineTo(-HOOP_RADIUS+20, 60);
        ctx.lineTo(HOOP_RADIUS-20, 60);
        ctx.lineTo(HOOP_RADIUS-10, 0);
        ctx.stroke();
        ctx.restore();
    }

    function drawHoopFront(h, active) {
        if(h.scale <= 0) return;
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.scale(h.scale, h.scale);
        ctx.lineWidth = 6;
        
        let color = '#9E9E9E'; 
        if (active) color = '#FF5722'; 
        else if (h.y < hoops[currentHoopIndex].y) {
            if (h.type === HOOP_TYPE.BACKBOARD) color = '#00E676'; 
            else if (h.type === HOOP_TYPE.MOVING) color = '#FFC107'; 
            else color = '#FFFFFF'; 
        }
        
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, HOOP_RADIUS, HOOP_RADIUS * 0.35, 0, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();
    }

    function createParticles(x, y, n) {
        for(let i=0; i<n; i++) {
            particles.push({
                type: 'dot',
                x, y, 
                vx: (Math.random()-0.5)*15, 
                vy: (Math.random()-0.5)*15, 
                life: 1, 
                color: `hsl(${20+Math.random()*30}, 100%, 50%)`
            });
        }
    }

    // [ИЗМЕНЕНИЕ 10] Функция для плавающего текста
    function createFloatingText(x, y, text, color) {
        particles.push({
            type: 'text',
            text: text,
            x: x,
            y: y,
            vy: -2, // Летит вверх
            life: 1.0,
            color: color
        });
    }

    function updateParticles(dt) {
        for(let i=particles.length-1; i>=0; i--) {
            let p = particles[i];
            
            if (p.type === 'dot') {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += 0.5 * dt;
                p.life -= 0.03 * dt;
            } else if (p.type === 'text') {
                p.y += p.vy * dt;
                p.life -= 0.015 * dt; // Текст живет дольше
            }

            if(p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.globalAlpha = p.life;
            if (p.type === 'dot') {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
                ctx.fill();
            }
        });
        ctx.globalAlpha = 1;
    }

    function drawFloatingTexts() {
        particles.forEach(p => {
            if (p.type === 'text') {
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.font = 'bold 30px Arial';
                ctx.textAlign = 'center';
                // Тень текста
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(p.text, p.x, p.y);
                ctx.restore();
            }
        });
    }

    // --- INPUT ---

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrag(e) {
        if (isGameOver || !ball.isSitting) return;
        const pos = getPos(e);
        isDragging = true;
        dragStart = pos;
        dragCurrent = pos;
    }

    function moveDrag(e) {
        if (!isDragging) return;
        e.preventDefault(); 
        dragCurrent = getPos(e);
    }

    function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        
        const dx = dragStart.x - dragCurrent.x;
        const dy = dragStart.y - dragCurrent.y;
        
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 30) return;

        let power = dist;
        if (power > MAX_DRAG) power = MAX_DRAG;

        const scale = power / dist;
        const finalDx = dx * scale;
        const finalDy = dy * scale;

        ball.vx = finalDx * DRAG_POWER;
        ball.vy = finalDy * DRAG_POWER;
        ball.isSitting = false;
        
        // [ИЗМЕНЕНИЕ 10] Сброс флага "касания" при начале броска
        shotTouchedRim = false;
    }

    function endGame() {
        isGameOver = true;
        finalScoreElement.innerText = `Счёт: ${score}`;
        gameOverScreen.classList.remove('hidden');
    }

    function updateScoreUI() {
        scoreElement.innerText = score;
    }

    canvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);

    canvas.addEventListener('touchstart', startDrag, {passive: false});
    window.addEventListener('touchmove', moveDrag, {passive: false});
    window.addEventListener('touchend', endDrag);

    restartButton.addEventListener('click', initGame);
    window.addEventListener('resize', () => { resize(); });

    initGame();
});
