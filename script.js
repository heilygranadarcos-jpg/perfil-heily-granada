(() => {
    const canvas = document.getElementById("celestial-canvas");
    const context = canvas?.getContext("2d");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!canvas || !context || reducedMotion.matches) {
        return;
    }

    const colors = ["#ffffff", "#d9c8ff", "#f7cbd7", "#f9e8a7"];
    const trail = [];
    const sparkles = [];
    let constellation = [];
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let pointer = null;
    let lastFrame = 0;
    let lastSparkle = 0;
    let animationFrame = 0;
    let touchPointerTimeout = 0;

    function resize() {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const starCount = Math.min(110, Math.max(36, Math.round((width * height) / 14000)));
        constellation = Array.from({ length: starCount }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: 0.8 + Math.random() * 1.3,
            phase: Math.random() * Math.PI * 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        }));
    }

    function addTrail(x, y) {
        if (trail.length >= 34) {
            trail.shift();
        }
        trail.push({
            x,
            y,
            radius: 1.5 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            age: 0,
            lifetime: 520 + Math.random() * 380
        });
    }

    function addSparkle() {
        if (sparkles.length >= 20) {
            return;
        }
        sparkles.push({
            x: Math.random() * width,
            y: height + 8,
            radius: 1 + Math.random() * 2.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 5 + Math.random() * 13,
            drift: (Math.random() - 0.5) * 9,
            phase: Math.random() * Math.PI * 2,
            age: 0,
            lifetime: 5000 + Math.random() * 5000
        });
    }

    function drawGlow(x, y, radius, color, alpha) {
        context.globalAlpha = alpha;
        context.fillStyle = color;
        context.shadowBlur = radius * 7;
        context.shadowColor = color;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
    }

    function drawConstellations(time) {
        for (const star of constellation) {
            const twinkle = 0.1 + (Math.sin(time / 650 + star.phase) + 1) * 0.06;
            context.globalAlpha = twinkle;
            context.fillStyle = star.color;
            context.beginPath();
            context.arc(star.x, star.y, star.radius * 0.75, 0, Math.PI * 2);
            context.fill();
        }
        context.globalAlpha = 1;

        if (!pointer) {
            return;
        }

        const active = [];
        for (const star of constellation) {
            const dx = star.x - pointer.x;
            const dy = star.y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 145) {
                const strength = 1 - distance / 145;
                active.push({ star, strength });
                const twinkle = 0.65 + Math.sin(time / 300 + star.phase) * 0.2;
                drawGlow(star.x, star.y, star.radius + strength * 1.4, star.color, strength * twinkle);
            }
        }

        for (let first = 0; first < active.length; first += 1) {
            for (let second = first + 1; second < active.length; second += 1) {
                const a = active[first];
                const b = active[second];
                const distance = Math.hypot(a.star.x - b.star.x, a.star.y - b.star.y);
                if (distance < 110) {
                    context.beginPath();
                    context.moveTo(a.star.x, a.star.y);
                    context.lineTo(b.star.x, b.star.y);
                    context.strokeStyle = `rgba(218, 198, 246, ${Math.min(a.strength, b.strength) * 0.48 * (1 - distance / 110)})`;
                    context.lineWidth = 0.8;
                    context.stroke();
                }
            }
        }
    }

    function animate(time) {
        if (document.hidden || reducedMotion.matches) {
            animationFrame = 0;
            return;
        }

        const delta = Math.min(time - (lastFrame || time), 40);
        lastFrame = time;
        context.clearRect(0, 0, width, height);

        if (time - lastSparkle > 420 + Math.random() * 720) {
            addSparkle();
            lastSparkle = time;
        }

        for (let index = trail.length - 1; index >= 0; index -= 1) {
            const particle = trail[index];
            particle.age += delta;
            if (particle.age >= particle.lifetime) {
                trail.splice(index, 1);
                continue;
            }
            const progress = particle.age / particle.lifetime;
            drawGlow(particle.x, particle.y, particle.radius * (1 - progress * 0.45), particle.color, 1 - progress);
        }

        for (let index = sparkles.length - 1; index >= 0; index -= 1) {
            const sparkle = sparkles[index];
            sparkle.age += delta;
            sparkle.y -= sparkle.speed * delta / 1000;
            sparkle.x += Math.sin(sparkle.age / 900 + sparkle.phase) * sparkle.drift * delta / 1000;
            if (sparkle.age >= sparkle.lifetime || sparkle.y < -10) {
                sparkles.splice(index, 1);
                continue;
            }
            const fade = Math.min(1, sparkle.age / 700, (sparkle.lifetime - sparkle.age) / 900);
            const twinkle = 0.7 + Math.sin(sparkle.age / 300 + sparkle.phase) * 0.3;
            drawGlow(sparkle.x, sparkle.y, sparkle.radius, sparkle.color, Math.max(0, fade * twinkle * 0.75));
        }

        drawConstellations(time);
        animationFrame = window.requestAnimationFrame(animate);
    }

    window.addEventListener("pointermove", (event) => {
        pointer = { x: event.clientX, y: event.clientY };
        window.clearTimeout(touchPointerTimeout);
        if (event.pointerType !== "touch" || event.buttons > 0) {
            addTrail(event.clientX, event.clientY);
        }
    }, { passive: true });

    window.addEventListener("pointerdown", (event) => {
        pointer = { x: event.clientX, y: event.clientY };
        window.clearTimeout(touchPointerTimeout);
        addTrail(event.clientX, event.clientY);
    }, { passive: true });

    window.addEventListener("pointerup", (event) => {
        if (event.pointerType === "touch") {
            touchPointerTimeout = window.setTimeout(() => {
                pointer = null;
            }, 1300);
        }
    }, { passive: true });

    window.addEventListener("pointerleave", () => {
        pointer = null;
    });

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            window.cancelAnimationFrame(animationFrame);
            animationFrame = 0;
        } else if (!reducedMotion.matches && !animationFrame) {
            lastFrame = 0;
            animationFrame = window.requestAnimationFrame(animate);
        }
    });

    reducedMotion.addEventListener("change", (event) => {
        if (event.matches) {
            window.cancelAnimationFrame(animationFrame);
            context.clearRect(0, 0, width, height);
            trail.length = 0;
            sparkles.length = 0;
        } else if (!document.hidden && !animationFrame) {
            animationFrame = window.requestAnimationFrame(animate);
        }
    });

    resize();
    animationFrame = window.requestAnimationFrame(animate);
})();
