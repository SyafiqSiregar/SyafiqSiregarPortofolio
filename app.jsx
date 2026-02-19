const { useState, useEffect, useRef, useCallback, useLayoutEffect } = React;

/* ===== Three.js 3D Particle System ===== */
function ThreeParticles() {
    const mountRef = useRef(null);
    useEffect(() => {
        if (!window.THREE) return;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mountRef.current.appendChild(renderer.domElement);

        // Particles
        const particleCount = 800;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const palette = [
            [0.424, 0.361, 0.906], // #6c5ce7
            [0.635, 0.608, 0.996], // #a29bfe
            [0.992, 0.475, 0.659], // #fd79a8
            [0.0, 0.808, 0.788],   // #00cec9
        ];
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
            sizes[i] = Math.random() * 3 + 1;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.7, sizeAttenuation: true, blending: THREE.AdditiveBlending });
        const points = new THREE.Points(geo, mat);
        scene.add(points);

        // Lines between nearby particles
        const lineMat = new THREE.LineBasicMaterial({ color: 0x6c5ce7, transparent: true, opacity: 0.06 });
        const lineGeo = new THREE.BufferGeometry();
        const linePositions = [];
        for (let i = 0; i < Math.min(particleCount, 200); i++) {
            for (let j = i + 1; j < Math.min(particleCount, 200); j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 2.5) {
                    linePositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
                    linePositions.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
                }
            }
        }
        lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        scene.add(lines);

        camera.position.z = 8;
        let mouseX = 0, mouseY = 0;
        const onMouseMove = (e) => {
            mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('mousemove', onMouseMove);

        let frame;
        const animate = () => {
            frame = requestAnimationFrame(animate);
            points.rotation.x += 0.0005;
            points.rotation.y += 0.0008;
            lines.rotation.x = points.rotation.x;
            lines.rotation.y = points.rotation.y;
            camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.02;
            camera.position.y += (-mouseY * 1.5 - camera.position.y) * 0.02;
            camera.lookAt(scene.position);

            // Scroll-based depth
            const scrollFactor = window.scrollY * 0.001;
            camera.position.z = 8 + scrollFactor * 3;
            points.rotation.z = scrollFactor * 0.5;

            renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('resize', onResize);
            if (mountRef.current && renderer.domElement) mountRef.current.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, []);
    return <div id="three-canvas" ref={mountRef} />;
}

/* ===== Hooks ===== */
function useScrollReveal() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { el.classList.add('active'); obs.unobserve(el); }
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return ref;
}

function useCounter(target, duration = 3000, delay = 0) {
    const [val, setVal] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                setIsVisible(true);
                obs.disconnect();
            }
        }, { threshold: 0.5 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const runAnimation = () => {
            setTimeout(() => {
                const start = performance.now();
                const animate = (now) => {
                    const p = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - p, 4);
                    setVal(Math.floor(target * eased));
                    if (p < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
            }, delay);
        };

        runAnimation();
        const interval = setInterval(runAnimation, 10000);

        return () => clearInterval(interval);
    }, [isVisible, target, duration, delay]);

    return [val, ref];
}



function useTilt() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handleMove = (e) => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const rotateX = (y - 0.5) * -12;
            const rotateY = (x - 0.5) * 12;
            el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`;
            const shine = el.querySelector('.card-shine');
            if (shine) { shine.style.setProperty('--shine-x', (x * 100) + '%'); shine.style.setProperty('--shine-y', (y * 100) + '%'); }
        };
        const handleLeave = () => { el.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)'; };
        el.addEventListener('mousemove', handleMove);
        el.addEventListener('mouseleave', handleLeave);
        return () => { el.removeEventListener('mousemove', handleMove); el.removeEventListener('mouseleave', handleLeave); };
    }, []);
    return ref;
}

/* ===== Components ===== */
function useMagnetic() {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const handleMove = (e) => {
            const { left, top, width, height } = el.getBoundingClientRect();
            const x = (e.clientX - (left + width / 2)) * 0.5;
            const y = (e.clientY - (top + height / 2)) * 0.5;
            el.style.transform = `translate(${x}px, ${y}px)`;
        };
        const handleLeave = () => {
            el.style.transform = 'translate(0px, 0px)';
        };
        el.addEventListener('mousemove', handleMove);
        el.addEventListener('mouseleave', handleLeave);
        return () => {
            el.removeEventListener('mousemove', handleMove);
            el.removeEventListener('mouseleave', handleLeave);
        };
    }, []);
    return ref;
}
function CursorGlow() {
    const ref = useRef(null);
    useEffect(() => {
        const handler = (e) => { if (ref.current) { ref.current.style.left = e.clientX + 'px'; ref.current.style.top = e.clientY + 'px'; } };
        document.addEventListener('mousemove', handler);
        return () => document.removeEventListener('mousemove', handler);
    }, []);
    return <div className="cursor-glow" ref={ref} />;
}


function Navbar({ scrolled }) {
    const [isOpen, setIsOpen] = useState(false);

    const scrollTo = (id) => {
        setIsOpen(false);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
            <div className="container">
                <span className="logo" onClick={() => scrollTo('hero')}>Portofolio✦</span>

                <div className={`nav-elements ${isOpen ? 'active' : ''}`}>
                    <div className="nav-badge"><span className="dot" /> Available for Projects</div>
                    <ul className="nav-links">
                        <li><a onClick={() => scrollTo('features')}>Skills</a></li>
                        <li><a onClick={() => scrollTo('work')}>Work</a></li>
                        <li><a onClick={() => scrollTo('testimonials')}>Testimonials</a></li>
                        <li><a className="nav-cta" onClick={() => scrollTo('contact')}>Hire Me</a></li>
                    </ul>
                </div>

                <div className={`hamburger${isOpen ? ' active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                </div>
            </div>
        </nav>
    );
}

function TypingText({ texts, speed = 80, pause = 2000, className = "gradient-text" }) {
    const [display, setDisplay] = useState('');
    const [idx, setIdx] = useState(0);
    const [charIdx, setCharIdx] = useState(0);
    const [deleting, setDeleting] = useState(false);
    useEffect(() => {
        const current = texts[idx];
        const timeout = setTimeout(() => {
            if (!deleting) {
                setDisplay(current.substring(0, charIdx + 1));
                if (charIdx + 1 === current.length) setTimeout(() => setDeleting(true), pause);
                else setCharIdx(charIdx + 1);
            } else {
                setDisplay(current.substring(0, charIdx));
                if (charIdx === 0) { setDeleting(false); setIdx((idx + 1) % texts.length); }
                else setCharIdx(charIdx - 1);
            }
        }, deleting ? speed / 2 : speed);
        return () => clearTimeout(timeout);
    }, [charIdx, deleting, idx, texts, speed, pause]);
    return <><span className={className}>{display}</span><span className="typing-cursor" /></>;
}

function HeroSection() {
    const skills = ['UI/UX Designer', 'Web Developer', 'Software Engineer', 'Graphic Designer'];
    const skillIcons = ['🎨', '💻', '⚙️', '✏️'];
    const [flipped, setFlipped] = useState(false);
    const btnRef1 = useMagnetic();
    const btnRef2 = useMagnetic();

    useEffect(() => {
        const interval = setInterval(() => {
            setFlipped(prev => !prev);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="hero" id="hero" style={{ position: 'relative' }}>
            {/* Infinity orbit rocket */}
            {(() => {
                const rocketRef = useRef(null);
                const trailRef = useRef(null);
                useEffect(() => {
                    const el = rocketRef.current;
                    if (!el) return;
                    let t = 0;
                    let frame;
                    const speed = 0.008; // slow smooth orbit
                    const animate = () => {
                        t += speed;
                        // Figure-8 lemniscate parametric: x = sin(t), y = sin(t)*cos(t)
                        const radiusX = 520;
                        const radiusY = 250;
                        const x = Math.sin(t) * radiusX;
                        const y = Math.sin(t) * Math.cos(t) * radiusY;
                        // Tangent direction: dx/dt = cos(t), dy/dt = cos(2t)
                        const dx = Math.cos(t) * radiusX;
                        const dy = Math.cos(2 * t) * radiusY;
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        // Rocket SVG points up (nose at top), so subtract 90° to align nose with path
                        el.style.transform = `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`;
                        frame = requestAnimationFrame(animate);
                    };
                    frame = requestAnimationFrame(animate);
                    return () => cancelAnimationFrame(frame);
                }, []);
                return (
                    <div className="rocket-infinity-container">
                        {/* Faint infinity trail */}
                        <svg className="infinity-trail" viewBox="-550 -270 1100 540" fill="none" xmlns="http://www.w3.org/2000/svg" ref={trailRef}>
                            <path d={(() => {
                                let d = '';
                                for (let i = 0; i <= 200; i++) {
                                    const a = (i / 200) * Math.PI * 2;
                                    const px = Math.sin(a) * 520;
                                    const py = Math.sin(a) * Math.cos(a) * 250;
                                    d += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1);
                                }
                                return d + 'Z';
                            })()} stroke="rgba(162,155,254,0.06)" strokeWidth="1.5" strokeDasharray="6 8" />
                        </svg>
                        {/* Rocket */}
                        <div className="rocket-infinity" ref={rocketRef}>
                            <svg viewBox="0 0 120 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="rocket-body-l" x1="50%" y1="0%" x2="50%" y2="100%">
                                        <stop offset="0%" stopColor="#a29bfe" />
                                        <stop offset="50%" stopColor="#6c5ce7" />
                                        <stop offset="100%" stopColor="#4834d4" />
                                    </linearGradient>
                                    <linearGradient id="rocket-window-l" x1="50%" y1="0%" x2="50%" y2="100%">
                                        <stop offset="0%" stopColor="#00cec9" />
                                        <stop offset="100%" stopColor="#6c5ce7" />
                                    </linearGradient>
                                    <linearGradient id="rocket-flame-l" x1="50%" y1="0%" x2="50%" y2="100%">
                                        <stop offset="0%" stopColor="#fd79a8" />
                                        <stop offset="40%" stopColor="#fdcb6e" />
                                        <stop offset="100%" stopColor="#fd79a8" stopOpacity="0" />
                                    </linearGradient>
                                    <filter id="rocket-glow-l">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                                    </filter>
                                </defs>
                                <path d="M60 30 C60 30 45 60 45 110 L45 170 C45 180 75 180 75 170 L75 110 C75 60 60 30 60 30Z" fill="url(#rocket-body-l)" opacity="0.8" stroke="rgba(162,155,254,0.7)" strokeWidth="1.2" />
                                <path d="M60 30 C60 30 52 50 50 80 L60 75 Z" fill="rgba(255,255,255,0.3)" />
                                <circle cx="60" cy="100" r="10" fill="rgba(0,206,201,0.3)" stroke="url(#rocket-window-l)" strokeWidth="1.5" opacity="0.9" />
                                <circle cx="60" cy="100" r="6" fill="url(#rocket-window-l)" opacity="0.5">
                                    <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
                                </circle>
                                <path d="M45 150 L25 180 L45 170Z" fill="url(#rocket-body-l)" opacity="0.5" stroke="rgba(162,155,254,0.5)" strokeWidth="0.8" />
                                <path d="M75 150 L95 180 L75 170Z" fill="url(#rocket-body-l)" opacity="0.5" stroke="rgba(162,155,254,0.5)" strokeWidth="0.8" />
                                <ellipse cx="60" cy="190" rx="12" ry="25" fill="url(#rocket-flame-l)" opacity="0.6" filter="url(#rocket-glow-l)">
                                    <animate attributeName="ry" values="25;35;25" dur="0.6s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.6;0.3;0.6" dur="0.4s" repeatCount="indefinite" />
                                </ellipse>
                                <ellipse cx="60" cy="190" rx="6" ry="15" fill="#fdcb6e" opacity="0.4">
                                    <animate attributeName="ry" values="15;22;15" dur="0.5s" repeatCount="indefinite" />
                                </ellipse>
                                <circle cx="55" cy="220" r="2" fill="#fd79a8" opacity="0.4">
                                    <animate attributeName="cy" values="220;260;220" dur="1.5s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite" />
                                </circle>
                            </svg>
                        </div>
                    </div>
                );
            })()}
            <div className="container">
                <div className="hero-content">
                    <div className="profile-wrapper" onClick={() => setFlipped(!flipped)}>
                        <div className={`profile-flipper${flipped ? ' flipped' : ''}`}>
                            <img className="profile-photo front" src="assets/images/profile/profile.jpeg" alt="Syafiq Siregar" />
                            <img className="profile-photo back" src="assets/images/profile/profile2.jpg" alt="Syafiq Siregar" />
                        </div>
                        <div className="profile-ring" />
                        <div className="profile-ring-2" />
                        <div className="profile-status" />
                    </div>

                    <div className="masked-reveal">
                        <h1>Hello, I'm <span className="gradient-text">Syafiq Siregar</span></h1>
                    </div>

                    <div className="subtitle">
                        <TypingText texts={skills} speed={70} pause={2500} />
                    </div>

                    <p className="hero-desc">Crafting beautiful digital experiences through design thinking, clean code, and creative innovation.</p>

                    <div className="skill-tags">
                        {skills.map((s, i) => (
                            <div className="skill-tag" key={i}>
                                <span><span className="tag-icon">{skillIcons[i]}</span>{s}</span>
                            </div>
                        ))}
                    </div>

                    <div className="hero-buttons">
                        <a href="#work" className="btn-primary" ref={btnRef1} onClick={e => { e.preventDefault(); document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' }); }}>
                            View My Work <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </a>
                        <a href="#contact" className="btn-secondary" ref={btnRef2} onClick={e => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>
                            Let's Talk <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4l6 4 6-4M2 4v8a1 1 0 001 1h10a1 1 0 001-1V4M2 4a1 1 0 011-1h10a1 1 0 011 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ===== Skill Card Canvas Animations ===== */
function SkillCardCanvas({ type }) {
    const canvasRef = useRef(null);
    const hoveredRef = useRef(false);
    const mouseRef = useRef({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        let frame;
        let t = 0;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const resize = () => {
            const rect = cvs.parentElement.getBoundingClientRect();
            cvs.width = rect.width * dpr;
            cvs.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        };
        resize();

        // --- ANIMATION DEFINITIONS ---
        // 1. UI/UX Design: floating color palette circles
        const uiuxParticles = Array.from({ length: 18 }, () => ({
            x: Math.random(), y: Math.random(),
            r: Math.random() * 6 + 3,
            vx: (Math.random() - 0.5) * 0.003,
            vy: (Math.random() - 0.5) * 0.003,
            hue: Math.floor(Math.random() * 360),
            phase: Math.random() * Math.PI * 2,
        }));

        // 2. Web Dev: floating code symbols
        const codeSymbols = ['<', '/', '>', '{', '}', ';', '()', '[]', '/>', '< >', '&&', '=>'];
        const codeParticles = Array.from({ length: 14 }, () => ({
            x: Math.random(), y: Math.random() + 0.2,
            vy: -(Math.random() * 0.004 + 0.001),
            vx: (Math.random() - 0.5) * 0.001,
            symbol: codeSymbols[Math.floor(Math.random() * codeSymbols.length)],
            opacity: Math.random() * 0.4 + 0.1,
            size: Math.random() * 6 + 8,
            phase: Math.random() * Math.PI * 2,
        }));

        // 3. Software Engineering: rotating gears
        const gears = [
            { x: 0.7, y: 0.35, r: 22, teeth: 8, speed: 0.008, dir: 1 },
            { x: 0.85, y: 0.6, r: 15, teeth: 6, speed: 0.012, dir: -1 },
            { x: 0.55, y: 0.7, r: 12, teeth: 5, speed: 0.015, dir: 1 },
        ];

        // 4. Graphic Design: animated bezier curves
        const curves = Array.from({ length: 5 }, (_, i) => ({
            phase: (i / 5) * Math.PI * 2,
            hue: [280, 320, 200, 160, 40][i],
            amplitude: Math.random() * 30 + 20,
        }));

        // 5. Mobile First: device outlines pulsing
        const devices = [
            { x: 0.65, y: 0.3, w: 22, h: 38, type: 'phone' },
            { x: 0.82, y: 0.55, w: 30, h: 22, type: 'tablet' },
            { x: 0.5, y: 0.7, w: 16, h: 28, type: 'phone' },
        ];

        // 6. Performance: speed streaks
        const streaks = Array.from({ length: 20 }, () => ({
            x: Math.random(), y: Math.random(),
            len: Math.random() * 30 + 10,
            speed: Math.random() * 0.015 + 0.005,
            opacity: Math.random() * 0.3 + 0.1,
            hue: Math.random() > 0.5 ? 270 : 170,
        }));

        function drawGear(ctx, cx, cy, outerR, innerR, teeth, angle, color) {
            ctx.beginPath();
            const step = (Math.PI * 2) / teeth;
            for (let i = 0; i < teeth; i++) {
                const a1 = angle + i * step;
                const a2 = a1 + step * 0.35;
                const a3 = a2 + step * 0.15;
                const a4 = a3 + step * 0.35;
                ctx.lineTo(cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR);
                ctx.lineTo(cx + Math.cos(a2) * outerR, cy + Math.sin(a2) * outerR);
                ctx.lineTo(cx + Math.cos(a3) * outerR, cy + Math.sin(a3) * outerR);
                ctx.lineTo(cx + Math.cos(a4) * innerR, cy + Math.sin(a4) * innerR);
            }
            ctx.closePath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // Center circle
            ctx.beginPath();
            ctx.arc(cx, cy, innerR * 0.35, 0, Math.PI * 2);
            ctx.stroke();
        }

        const animate = () => {
            const w = cvs.width / dpr;
            const h = cvs.height / dpr;
            ctx.clearRect(0, 0, w, h);
            const speed = hoveredRef.current ? 2.5 : 1;
            const alpha = hoveredRef.current ? 1.0 : 0.6;
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            t += 0.016 * speed;

            if (type === 'uiux') {
                uiuxParticles.forEach(p => {
                    p.x += p.vx * speed;
                    p.y += p.vy * speed;
                    if (p.x < 0 || p.x > 1) p.vx *= -1;
                    if (p.y < 0 || p.y > 1) p.vy *= -1;
                    p.hue = (p.hue + 0.3 * speed) % 360;
                    const pulse = Math.sin(t * 2 + p.phase) * 0.3 + 1;
                    const px = p.x * w;
                    const py = p.y * h;
                    const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r * pulse * 2);
                    grad.addColorStop(0, `hsla(${p.hue}, 80%, 65%, ${0.35 * alpha})`);
                    grad.addColorStop(1, `hsla(${p.hue}, 80%, 65%, 0)`);
                    ctx.beginPath();
                    ctx.arc(px, py, p.r * pulse * 2, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(px, py, p.r * pulse * 0.7, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${0.5 * alpha})`;
                    ctx.fill();
                });
                // Connection lines between close particles
                for (let i = 0; i < uiuxParticles.length; i++) {
                    for (let j = i + 1; j < uiuxParticles.length; j++) {
                        const dx = (uiuxParticles[i].x - uiuxParticles[j].x) * w;
                        const dy = (uiuxParticles[i].y - uiuxParticles[j].y) * h;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 60) {
                            ctx.beginPath();
                            ctx.moveTo(uiuxParticles[i].x * w, uiuxParticles[i].y * h);
                            ctx.lineTo(uiuxParticles[j].x * w, uiuxParticles[j].y * h);
                            ctx.strokeStyle = `rgba(162, 155, 254, ${(1 - dist / 60) * 0.15 * alpha})`;
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                        }
                    }
                }
            }

            else if (type === 'webdev') {
                codeParticles.forEach(p => {
                    p.y += p.vy * speed;
                    p.x += Math.sin(t * 3 + p.phase) * 0.001;
                    if (p.y < -0.1) { p.y = 1.1; p.x = Math.random(); }
                    const float = Math.sin(t * 2 + p.phase) * 3;
                    const px = p.x * w;
                    const py = p.y * h + float;
                    ctx.font = `${p.size}px 'Space Grotesk', monospace`;
                    ctx.fillStyle = `rgba(162, 155, 254, ${p.opacity * alpha})`;
                    ctx.textAlign = 'center';
                    ctx.fillText(p.symbol, px, py);
                });
                // Floating cursor blink effect
                const cursorX = 0.3 * w + Math.sin(t) * 10;
                const cursorY = 0.5 * h + Math.cos(t * 1.3) * 8;
                if (Math.sin(t * 4) > 0) {
                    ctx.fillStyle = `rgba(253, 121, 168, ${0.4 * alpha})`;
                    ctx.fillRect(cursorX, cursorY - 8, 2, 16);
                }
            }

            else if (type === 'softeng') {
                gears.forEach(g => {
                    const cx = g.x * w;
                    const cy = g.y * h;
                    const angle = t * g.speed * 60 * g.dir;
                    const hoverScale = hoveredRef.current ? 1.15 : 1;
                    drawGear(ctx, cx, cy, g.r * hoverScale, g.r * 0.7 * hoverScale, g.teeth, angle, `rgba(108, 92, 231, ${0.3 * alpha})`);
                });
                // Dots connecting gears
                for (let i = 0; i < gears.length - 1; i++) {
                    ctx.beginPath();
                    ctx.setLineDash([3, 5]);
                    ctx.moveTo(gears[i].x * w, gears[i].y * h);
                    ctx.lineTo(gears[i + 1].x * w, gears[i + 1].y * h);
                    ctx.strokeStyle = `rgba(108, 92, 231, ${0.12 * alpha})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
                // Floating binary bits
                for (let i = 0; i < 8; i++) {
                    const bx = (0.1 + (i / 8) * 0.8) * w;
                    const by = (0.15 + Math.sin(t * 1.5 + i) * 0.05) * h;
                    ctx.font = '9px monospace';
                    ctx.fillStyle = `rgba(0, 206, 201, ${0.2 * alpha})`;
                    ctx.fillText(Math.sin(t + i * 2) > 0 ? '1' : '0', bx, by);
                }
            }

            else if (type === 'graphic') {
                curves.forEach((c, i) => {
                    ctx.beginPath();
                    const startX = 0;
                    const startY = (0.3 + i * 0.12) * h;
                    ctx.moveTo(startX, startY);
                    for (let x = 0; x <= w; x += 2) {
                        const progress = x / w;
                        const y = startY +
                            Math.sin(progress * Math.PI * 2 + t * 2 + c.phase) * c.amplitude * (0.5 + mx * 0.5) +
                            Math.sin(progress * Math.PI * 4 + t * 1.3 + c.phase) * c.amplitude * 0.3;
                        ctx.lineTo(x, y);
                    }
                    const grad = ctx.createLinearGradient(0, 0, w, 0);
                    grad.addColorStop(0, `hsla(${c.hue}, 80%, 65%, 0)`);
                    grad.addColorStop(0.3, `hsla(${c.hue}, 80%, 65%, ${0.25 * alpha})`);
                    grad.addColorStop(0.7, `hsla(${c.hue}, 80%, 65%, ${0.25 * alpha})`);
                    grad.addColorStop(1, `hsla(${c.hue}, 80%, 65%, 0)`);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                });
                // Pen tool dots
                for (let i = 0; i < 4; i++) {
                    const dx = (0.2 + i * 0.2) * w;
                    const dy = (0.5 + Math.sin(t * 1.5 + i * 1.5) * 0.15) * h;
                    ctx.beginPath();
                    ctx.arc(dx, dy, 3, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(253, 121, 168, ${0.4 * alpha})`;
                    ctx.fill();
                    // Handles
                    ctx.beginPath();
                    ctx.moveTo(dx - 10, dy - 8 * Math.sin(t + i));
                    ctx.lineTo(dx, dy);
                    ctx.lineTo(dx + 10, dy + 8 * Math.cos(t + i));
                    ctx.strokeStyle = `rgba(253, 121, 168, ${0.2 * alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }

            else if (type === 'mobile') {
                devices.forEach((d, i) => {
                    const cx = d.x * w;
                    const cy = d.y * h;
                    const pulse = 1 + Math.sin(t * 2 + i * 1.5) * 0.05;
                    const dw = d.w * pulse;
                    const dh = d.h * pulse;
                    // Device outline
                    ctx.beginPath();
                    const borderR = d.type === 'phone' ? 4 : 3;
                    ctx.roundRect(cx - dw / 2, cy - dh / 2, dw, dh, borderR);
                    ctx.strokeStyle = `rgba(0, 206, 201, ${0.3 * alpha})`;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    // Screen area
                    ctx.beginPath();
                    ctx.roundRect(cx - dw / 2 + 2, cy - dh / 2 + (d.type === 'phone' ? 5 : 3), dw - 4, dh - (d.type === 'phone' ? 10 : 6), 2);
                    ctx.fillStyle = `rgba(108, 92, 231, ${0.06 * alpha})`;
                    ctx.fill();
                    // Screen "content" lines
                    for (let l = 0; l < 3; l++) {
                        const lw = (dw - 10) * (0.5 + Math.sin(t * 1.5 + l + i) * 0.2);
                        const lx = cx - dw / 2 + 5;
                        const ly = cy - dh / 2 + (d.type === 'phone' ? 10 : 7) + l * 5;
                        ctx.fillStyle = `rgba(162, 155, 254, ${0.2 * alpha})`;
                        ctx.fillRect(lx, ly, lw, 2);
                    }
                });
                // Wifi/signal waves
                const sigX = 0.3 * w;
                const sigY = 0.25 * h;
                for (let i = 0; i < 3; i++) {
                    const r = 8 + i * 8;
                    const wave = Math.sin(t * 3 - i * 0.5);
                    if (wave > -0.3) {
                        ctx.beginPath();
                        ctx.arc(sigX, sigY, r, -Math.PI * 0.35, -Math.PI * 0.65, true);
                        ctx.strokeStyle = `rgba(0, 206, 201, ${(0.3 - i * 0.08) * alpha * (wave * 0.5 + 0.5)})`;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
            }

            else if (type === 'performance') {
                streaks.forEach(s => {
                    s.x += s.speed * speed;
                    if (s.x > 1.2) { s.x = -0.1; s.y = Math.random(); s.opacity = Math.random() * 0.3 + 0.1; }
                    const sx = s.x * w;
                    const sy = s.y * h;
                    const grad = ctx.createLinearGradient(sx - s.len, sy, sx, sy);
                    grad.addColorStop(0, `hsla(${s.hue}, 80%, 65%, 0)`);
                    grad.addColorStop(1, `hsla(${s.hue}, 80%, 65%, ${s.opacity * alpha})`);
                    ctx.beginPath();
                    ctx.moveTo(sx - s.len, sy);
                    ctx.lineTo(sx, sy);
                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    // Bright head
                    ctx.beginPath();
                    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${s.hue}, 90%, 80%, ${s.opacity * 1.5 * alpha})`;
                    ctx.fill();
                });
                // Speed meter gauge
                const gaugeX = 0.2 * w;
                const gaugeY = 0.65 * h;
                const gaugeR = 18;
                ctx.beginPath();
                ctx.arc(gaugeX, gaugeY, gaugeR, Math.PI * 0.8, Math.PI * 2.2);
                ctx.strokeStyle = `rgba(108, 92, 231, ${0.2 * alpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                // Needle
                const needleAngle = Math.PI * 0.8 + (Math.PI * 1.4) * (0.7 + Math.sin(t * 2) * 0.3);
                ctx.beginPath();
                ctx.moveTo(gaugeX, gaugeY);
                ctx.lineTo(gaugeX + Math.cos(needleAngle) * gaugeR * 0.85, gaugeY + Math.sin(needleAngle) * gaugeR * 0.85);
                ctx.strokeStyle = `rgba(253, 121, 168, ${0.5 * alpha})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            frame = requestAnimationFrame(animate);
        };

        frame = requestAnimationFrame(animate);
        const ro = new ResizeObserver(resize);
        ro.observe(cvs.parentElement);

        return () => {
            cancelAnimationFrame(frame);
            ro.disconnect();
        };
    }, [type]);

    const handleMouseEnter = () => { hoveredRef.current = true; };
    const handleMouseLeave = () => { hoveredRef.current = false; mouseRef.current = { x: 0.5, y: 0.5 }; };
    const handleMouseMove = (e) => {
        const rect = canvasRef.current?.parentElement?.getBoundingClientRect();
        if (rect) {
            mouseRef.current = {
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height,
            };
        }
    };

    return (
        <canvas
            ref={canvasRef}
            className="skill-canvas"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
        />
    );
}

/* ===== Futuristic 3D Icons ===== */
function FuturisticIcon({ type, accentColor }) {
    const icons = {
        uiux: (
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="uiux-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a29bfe" />
                        <stop offset="100%" stopColor="#6c5ce7" />
                    </linearGradient>
                    <linearGradient id="uiux-g2" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fd79a8" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#a29bfe" stopOpacity="0.8" />
                    </linearGradient>
                    <filter id="uiux-glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {/* Back panel */}
                <rect x="18" y="8" width="28" height="20" rx="3" fill="url(#uiux-g2)" opacity="0.5" transform="rotate(6 32 18)" />
                {/* Middle panel */}
                <rect x="14" y="12" width="28" height="20" rx="3" fill="url(#uiux-g1)" opacity="0.7" transform="rotate(-3 28 22)" />
                {/* Front panel */}
                <rect x="10" y="16" width="28" height="20" rx="3" fill="url(#uiux-g1)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                {/* UI elements on front panel */}
                <rect x="13" y="19" width="10" height="2" rx="1" fill="rgba(255,255,255,0.7)" />
                <rect x="13" y="23" width="22" height="1.5" rx="0.75" fill="rgba(255,255,255,0.3)" />
                <rect x="13" y="27" width="16" height="1.5" rx="0.75" fill="rgba(255,255,255,0.3)" />
                <rect x="13" y="31" width="8" height="3" rx="1.5" fill="#fd79a8" opacity="0.8" />
                {/* Color dots */}
                <circle cx="42" cy="42" r="4" fill="#fd79a8" filter="url(#uiux-glow)" opacity="0.9" />
                <circle cx="34" cy="44" r="3" fill="#a29bfe" filter="url(#uiux-glow)" opacity="0.8" />
                <circle cx="46" cy="36" r="2.5" fill="#00cec9" opacity="0.7" />
            </svg>
        ),
        webdev: (
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="web-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6c5ce7" />
                        <stop offset="100%" stopColor="#a29bfe" />
                    </linearGradient>
                    <filter id="web-glow">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {/* Terminal window */}
                <rect x="6" y="10" width="44" height="36" rx="4" fill="rgba(18,18,26,0.9)" stroke="url(#web-g1)" strokeWidth="1.5" />
                {/* Title bar */}
                <rect x="6" y="10" width="44" height="8" rx="4" fill="url(#web-g1)" opacity="0.2" />
                <circle cx="12" cy="14" r="1.5" fill="#ff5f56" />
                <circle cx="17" cy="14" r="1.5" fill="#ffbd2e" />
                <circle cx="22" cy="14" r="1.5" fill="#27c93f" />
                {/* Code lines */}
                <text x="10" y="26" fontSize="7" fontFamily="monospace" fill="#6c5ce7" filter="url(#web-glow)">{'<'}</text>
                <text x="16" y="26" fontSize="7" fontFamily="monospace" fill="#a29bfe">div</text>
                <text x="28" y="26" fontSize="7" fontFamily="monospace" fill="#6c5ce7" filter="url(#web-glow)">{'>'}</text>
                <rect x="14" y="29" width="20" height="1.5" rx="0.75" fill="#00cec9" opacity="0.5" />
                <rect x="14" y="33" width="14" height="1.5" rx="0.75" fill="#fd79a8" opacity="0.4" />
                <text x="10" y="41" fontSize="7" fontFamily="monospace" fill="#6c5ce7" filter="url(#web-glow)">{'</'}</text>
                <text x="19" y="41" fontSize="7" fontFamily="monospace" fill="#a29bfe">div</text>
                <text x="31" y="41" fontSize="7" fontFamily="monospace" fill="#6c5ce7" filter="url(#web-glow)">{'>'}</text>
                {/* Blinking cursor */}
                <rect x="36" y="35" width="1.5" height="7" rx="0.5" fill="#a29bfe" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite" />
                </rect>
            </svg>
        ),
        softeng: (
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="eng-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00cec9" />
                        <stop offset="100%" stopColor="#6c5ce7" />
                    </linearGradient>
                    <filter id="eng-glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {/* Outer hexagon */}
                <polygon points="28,4 48,15 48,37 28,48 8,37 8,15" fill="none" stroke="url(#eng-g1)" strokeWidth="1.5" opacity="0.4" />
                {/* Inner hexagon */}
                <polygon points="28,10 42,18 42,34 28,42 14,34 14,18" fill="rgba(0,206,201,0.08)" stroke="url(#eng-g1)" strokeWidth="1" />
                {/* Circuit lines */}
                <line x1="28" y1="10" x2="28" y2="4" stroke="#00cec9" strokeWidth="1" opacity="0.5" />
                <line x1="42" y1="18" x2="48" y2="15" stroke="#00cec9" strokeWidth="1" opacity="0.5" />
                <line x1="42" y1="34" x2="48" y2="37" stroke="#00cec9" strokeWidth="1" opacity="0.5" />
                <line x1="14" y1="18" x2="8" y2="15" stroke="#6c5ce7" strokeWidth="1" opacity="0.5" />
                <line x1="14" y1="34" x2="8" y2="37" stroke="#6c5ce7" strokeWidth="1" opacity="0.5" />
                {/* Core circle */}
                <circle cx="28" cy="26" r="8" fill="rgba(0,206,201,0.15)" stroke="url(#eng-g1)" strokeWidth="1.5" filter="url(#eng-glow)" />
                {/* Gear teeth on core */}
                <circle cx="28" cy="26" r="5" fill="none" stroke="#00cec9" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6">
                    <animateTransform attributeName="transform" type="rotate" from="0 28 26" to="360 28 26" dur="8s" repeatCount="indefinite" />
                </circle>
                {/* Node dots */}
                <circle cx="28" cy="10" r="2" fill="#00cec9" filter="url(#eng-glow)" />
                <circle cx="42" cy="18" r="2" fill="#6c5ce7" filter="url(#eng-glow)" />
                <circle cx="42" cy="34" r="2" fill="#00cec9" filter="url(#eng-glow)" />
                <circle cx="28" cy="42" r="2" fill="#6c5ce7" filter="url(#eng-glow)" />
                <circle cx="14" cy="34" r="2" fill="#00cec9" filter="url(#eng-glow)" />
                <circle cx="14" cy="18" r="2" fill="#6c5ce7" filter="url(#eng-glow)" />
                {/* Center dot */}
                <circle cx="28" cy="26" r="2.5" fill="#00cec9" filter="url(#eng-glow)">
                    <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />
                </circle>
            </svg>
        ),
        graphic: (
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="gfx-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fd79a8" />
                        <stop offset="100%" stopColor="#a29bfe" />
                    </linearGradient>
                    <linearGradient id="gfx-g2" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#6c5ce7" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#fd79a8" stopOpacity="0.9" />
                    </linearGradient>
                    <filter id="gfx-glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {/* Diamond/prism shape */}
                <polygon points="28,4 46,26 28,48 10,26" fill="rgba(253,121,168,0.1)" stroke="url(#gfx-g1)" strokeWidth="1.5" />
                {/* Inner diamond */}
                <polygon points="28,12 40,26 28,40 16,26" fill="rgba(253,121,168,0.08)" stroke="url(#gfx-g2)" strokeWidth="1" opacity="0.7" />
                {/* Refraction lines */}
                <line x1="28" y1="4" x2="16" y2="26" stroke="#fd79a8" strokeWidth="0.5" opacity="0.3" />
                <line x1="28" y1="4" x2="40" y2="26" stroke="#a29bfe" strokeWidth="0.5" opacity="0.3" />
                <line x1="10" y1="26" x2="46" y2="26" stroke="url(#gfx-g1)" strokeWidth="0.5" opacity="0.4" />
                {/* Spectrum rays from prism */}
                <line x1="46" y1="26" x2="54" y2="18" stroke="#ff6b6b" strokeWidth="1" opacity="0.5" />
                <line x1="46" y1="26" x2="54" y2="22" stroke="#ffa502" strokeWidth="1" opacity="0.5" />
                <line x1="46" y1="26" x2="54" y2="26" stroke="#ffd93d" strokeWidth="1" opacity="0.5" />
                <line x1="46" y1="26" x2="54" y2="30" stroke="#6c5ce7" strokeWidth="1" opacity="0.5" />
                <line x1="46" y1="26" x2="54" y2="34" stroke="#a29bfe" strokeWidth="1" opacity="0.5" />
                {/* Center glow */}
                <circle cx="28" cy="26" r="4" fill="#fd79a8" filter="url(#gfx-glow)" opacity="0.6">
                    <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2.5s" repeatCount="indefinite" />
                </circle>
                {/* Orbiting dot */}
                <circle cx="28" cy="14" r="1.5" fill="#a29bfe" filter="url(#gfx-glow)">
                    <animateTransform attributeName="transform" type="rotate" from="0 28 26" to="360 28 26" dur="6s" repeatCount="indefinite" />
                </circle>
            </svg>
        ),
        mobile: (
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="mob-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00cec9" />
                        <stop offset="100%" stopColor="#6c5ce7" />
                    </linearGradient>
                    <filter id="mob-glow">
                        <feGaussianBlur stdDeviation="1.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {/* Phone body */}
                <rect x="16" y="4" width="24" height="44" rx="4" fill="rgba(18,18,26,0.9)" stroke="url(#mob-g1)" strokeWidth="1.5" />
                {/* Screen */}
                <rect x="18" y="9" width="20" height="33" rx="2" fill="rgba(0,206,201,0.06)" />
                {/* Status bar */}
                <rect x="20" y="11" width="8" height="1" rx="0.5" fill="#00cec9" opacity="0.4" />
                <rect x="32" y="11" width="4" height="1" rx="0.5" fill="#6c5ce7" opacity="0.4" />
                {/* UI blocks on screen */}
                <rect x="20" y="15" width="16" height="6" rx="1.5" fill="url(#mob-g1)" opacity="0.25" />
                <rect x="20" y="23" width="7" height="7" rx="1.5" fill="rgba(253,121,168,0.2)" stroke="#fd79a8" strokeWidth="0.5" opacity="0.6" />
                <rect x="29" y="23" width="7" height="7" rx="1.5" fill="rgba(108,92,231,0.2)" stroke="#6c5ce7" strokeWidth="0.5" opacity="0.6" />
                <rect x="20" y="32" width="16" height="2" rx="1" fill="#a29bfe" opacity="0.3" />
                <rect x="20" y="36" width="12" height="2" rx="1" fill="#a29bfe" opacity="0.2" />
                {/* Home indicator */}
                <rect x="24" y="44" width="8" height="1.5" rx="0.75" fill="#00cec9" opacity="0.4" />
                {/* Floating notification badge */}
                <circle cx="42" cy="10" r="5" fill="rgba(253,121,168,0.15)" stroke="#fd79a8" strokeWidth="0.8" filter="url(#mob-glow)">
                    <animate attributeName="r" values="5;6;5" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x="42" y="12" fontSize="6" fill="#fd79a8" textAnchor="middle" fontWeight="bold">3</text>
                {/* Signal waves */}
                <path d="M8 20 Q4 16 8 12" stroke="#00cec9" strokeWidth="1" fill="none" opacity="0.4" />
                <path d="M6 22 Q0 16 6 10" stroke="#00cec9" strokeWidth="0.8" fill="none" opacity="0.25" />
            </svg>
        ),
        performance: (
            <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="perf-g1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fd79a8" />
                        <stop offset="100%" stopColor="#6c5ce7" />
                    </linearGradient>
                    <linearGradient id="perf-g2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ffd93d" />
                        <stop offset="100%" stopColor="#fd79a8" />
                    </linearGradient>
                    <filter id="perf-glow">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {/* Lightning bolt */}
                <polygon points="30,2 18,24 26,24 22,50 40,22 31,22 36,2" fill="url(#perf-g2)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" filter="url(#perf-glow)" />
                {/* Speed lines */}
                <line x1="4" y1="16" x2="14" y2="16" stroke="#fd79a8" strokeWidth="1.5" strokeLinecap="round" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite" />
                </line>
                <line x1="2" y1="22" x2="16" y2="22" stroke="#a29bfe" strokeWidth="1" strokeLinecap="round" opacity="0.4">
                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.3s" repeatCount="indefinite" />
                </line>
                <line x1="6" y1="28" x2="18" y2="28" stroke="#6c5ce7" strokeWidth="1" strokeLinecap="round" opacity="0.35">
                    <animate attributeName="opacity" values="0.35;0.1;0.35" dur="0.8s" repeatCount="indefinite" />
                </line>
                <line x1="42" y1="30" x2="52" y2="30" stroke="#fd79a8" strokeWidth="1" strokeLinecap="round" opacity="0.35">
                    <animate attributeName="opacity" values="0.35;0.1;0.35" dur="1.1s" repeatCount="indefinite" />
                </line>
                <line x1="44" y1="36" x2="54" y2="36" stroke="#a29bfe" strokeWidth="1.5" strokeLinecap="round" opacity="0.4">
                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="0.9s" repeatCount="indefinite" />
                </line>
                {/* Energy ring */}
                <circle cx="30" cy="26" r="18" fill="none" stroke="url(#perf-g1)" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.35">
                    <animateTransform attributeName="transform" type="rotate" from="0 30 26" to="360 30 26" dur="4s" repeatCount="indefinite" />
                </circle>
                {/* Spark dots */}
                <circle cx="14" cy="12" r="1.5" fill="#ffd93d" opacity="0.6">
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="46" cy="42" r="1.5" fill="#fd79a8" opacity="0.5">
                    <animate attributeName="opacity" values="0;0.5;0" dur="2s" repeatCount="indefinite" />
                </circle>
            </svg>
        ),
    };
    return (
        <div className="futuristic-icon-wrapper">
            <div className="futuristic-icon-inner" style={{ '--icon-accent': accentColor }}>
                {icons[type]}
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc, floatIcon, animType, accentColor, delay }) {
    const rev = useScrollReveal();
    const tilt = useTilt();
    return (
        <div
            className="feature-card reveal tilt-card"
            ref={e => { rev.current = e; tilt.current = e; }}
            style={{ '--card-accent': accentColor, '--card-delay': delay + 'ms' }}
        >
            <div className="card-shine" />
            <SkillCardCanvas type={animType} />
            <div className="feature-card-content">
                <div className="float-element">{floatIcon}</div>
                <FuturisticIcon type={animType} accentColor={accentColor} />
                <h3>{title}</h3>
                <p>{desc}</p>
            </div>
            <div className="feature-card-glow" />
        </div>
    );
}

function DesignFeatureCard({ image, title, desc, delay, accentColor, className }) {
    const rev = useScrollReveal();
    const tilt = useTilt();
    return (
        <div
            className={`feature-card reveal tilt-card design-feature-card ${className || ''}`}
            ref={e => { rev.current = e; tilt.current = e; }}
            style={{ '--card-accent': accentColor, '--card-delay': delay + 'ms' }}
        >
            <div className="card-shine" />
            <div className="design-image-wrapper">
                <img src={image || 'placeholder.png'} alt={title} loading="lazy" />
            </div>
            <div className="feature-card-content">
                <h3>{title}</h3>
                <p>{desc}</p>
            </div>
            <div className="feature-card-glow" />
        </div>
    );
}

function FeaturesSection() {
    const ref = useScrollReveal();
    const features = [
        { icon: '🎨', title: 'UI/UX Design', desc: 'Creating intuitive, pixel-perfect interfaces with user-centered design principles and modern aesthetics.', floatIcon: '◆', animType: 'uiux', accentColor: '#a29bfe', delay: 0 },
        { icon: '💻', title: 'Web Development', desc: 'Building responsive, performant websites and web applications using React, Next.js, and modern frameworks.', floatIcon: '⟡', animType: 'webdev', accentColor: '#6c5ce7', delay: 80 },
        { icon: '⚙️', title: 'Software Engineering', desc: 'Architecting scalable software solutions with clean code, design patterns, and best practices.', floatIcon: '◇', animType: 'softeng', accentColor: '#00cec9', delay: 160 },
        { icon: '✏️', title: 'Graphic Design', desc: 'Crafting stunning visual identities, illustrations, and marketing materials that captivate audiences.', floatIcon: '△', animType: 'graphic', accentColor: '#fd79a8', delay: 240 },
        { icon: '📱', title: 'Mobile First', desc: 'Designing responsive experiences that look and feel amazing on every screen size and device.', floatIcon: '○', animType: 'mobile', accentColor: '#00cec9', delay: 320 },
        { icon: '🚀', title: 'Performance', desc: 'Optimizing every pixel and byte for blazing-fast load times and smooth user experiences.', floatIcon: '☆', animType: 'performance', accentColor: '#fd79a8', delay: 400 },
    ];

    const RocketLeft = () => (
        <svg className="rocket-deco rocket-left" viewBox="0 0 120 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="rocket-body-l" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#a29bfe" />
                    <stop offset="50%" stopColor="#6c5ce7" />
                    <stop offset="100%" stopColor="#4834d4" />
                </linearGradient>
                <linearGradient id="rocket-window-l" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#00cec9" />
                    <stop offset="100%" stopColor="#6c5ce7" />
                </linearGradient>
                <linearGradient id="rocket-flame-l" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#fd79a8" />
                    <stop offset="40%" stopColor="#fdcb6e" />
                    <stop offset="100%" stopColor="#fd79a8" stopOpacity="0" />
                </linearGradient>
                <filter id="rocket-glow-l">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Rocket body */}
            <path d="M60 30 C60 30 45 60 45 110 L45 170 C45 180 75 180 75 170 L75 110 C75 60 60 30 60 30Z" fill="url(#rocket-body-l)" opacity="0.55" stroke="rgba(162,155,254,0.6)" strokeWidth="1.2" />
            {/* Nose cone highlight */}
            <path d="M60 30 C60 30 52 50 50 80 L60 75 Z" fill="rgba(255,255,255,0.2)" />
            {/* Window */}
            <circle cx="60" cy="100" r="10" fill="rgba(0,206,201,0.3)" stroke="url(#rocket-window-l)" strokeWidth="1.5" opacity="0.8" />
            <circle cx="60" cy="100" r="6" fill="url(#rocket-window-l)" opacity="0.4">
                <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
            {/* Fins */}
            <path d="M45 150 L25 180 L45 170Z" fill="url(#rocket-body-l)" opacity="0.4" stroke="rgba(162,155,254,0.5)" strokeWidth="0.8" />
            <path d="M75 150 L95 180 L75 170Z" fill="url(#rocket-body-l)" opacity="0.4" stroke="rgba(162,155,254,0.5)" strokeWidth="0.8" />
            {/* Exhaust flames */}
            <ellipse cx="60" cy="190" rx="12" ry="25" fill="url(#rocket-flame-l)" opacity="0.5" filter="url(#rocket-glow-l)">
                <animate attributeName="ry" values="25;35;25" dur="0.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.3;0.5" dur="0.4s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="60" cy="190" rx="6" ry="15" fill="#fdcb6e" opacity="0.35">
                <animate attributeName="ry" values="15;22;15" dur="0.5s" repeatCount="indefinite" />
            </ellipse>
            {/* Exhaust particles */}
            <circle cx="55" cy="220" r="2" fill="#fd79a8" opacity="0.4">
                <animate attributeName="cy" values="220;260;220" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="65" cy="230" r="1.5" fill="#a29bfe" opacity="0.3">
                <animate attributeName="cy" values="230;270;230" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx="58" cy="240" r="1.5" fill="#fdcb6e" opacity="0.3">
                <animate attributeName="cy" values="240;280;240" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Star sparkles */}
            <circle cx="30" cy="60" r="1.5" fill="#a29bfe" opacity="0.5">
                <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="90" cy="130" r="1.2" fill="#00cec9" opacity="0.5">
                <animate attributeName="opacity" values="0.1;0.5;0.1" dur="3s" repeatCount="indefinite" />
            </circle>
        </svg>
    );

    const RocketRight = () => (
        <svg className="rocket-deco rocket-right" viewBox="0 0 120 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="rocket-body-r" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#00cec9" />
                    <stop offset="50%" stopColor="#6c5ce7" />
                    <stop offset="100%" stopColor="#4834d4" />
                </linearGradient>
                <linearGradient id="rocket-window-r" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#fd79a8" />
                    <stop offset="100%" stopColor="#a29bfe" />
                </linearGradient>
                <linearGradient id="rocket-flame-r" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#a29bfe" />
                    <stop offset="40%" stopColor="#00cec9" />
                    <stop offset="100%" stopColor="#6c5ce7" stopOpacity="0" />
                </linearGradient>
                <filter id="rocket-glow-r">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Rocket body */}
            <path d="M60 30 C60 30 45 60 45 110 L45 170 C45 180 75 180 75 170 L75 110 C75 60 60 30 60 30Z" fill="url(#rocket-body-r)" opacity="0.55" stroke="rgba(0,206,201,0.6)" strokeWidth="1.2" />
            {/* Nose cone highlight */}
            <path d="M60 30 C60 30 68 50 70 80 L60 75 Z" fill="rgba(255,255,255,0.2)" />
            {/* Window */}
            <circle cx="60" cy="100" r="10" fill="rgba(253,121,168,0.25)" stroke="url(#rocket-window-r)" strokeWidth="1.5" opacity="0.8" />
            <circle cx="60" cy="100" r="6" fill="url(#rocket-window-r)" opacity="0.4">
                <animate attributeName="opacity" values="0.4;0.7;0.4" dur="3.5s" repeatCount="indefinite" />
            </circle>
            {/* Fins */}
            <path d="M45 150 L25 180 L45 170Z" fill="url(#rocket-body-r)" opacity="0.4" stroke="rgba(0,206,201,0.5)" strokeWidth="0.8" />
            <path d="M75 150 L95 180 L75 170Z" fill="url(#rocket-body-r)" opacity="0.4" stroke="rgba(0,206,201,0.5)" strokeWidth="0.8" />
            {/* Exhaust flames */}
            <ellipse cx="60" cy="190" rx="12" ry="25" fill="url(#rocket-flame-r)" opacity="0.5" filter="url(#rocket-glow-r)">
                <animate attributeName="ry" values="25;32;25" dur="0.7s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.3;0.5" dur="0.5s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="60" cy="190" rx="6" ry="15" fill="#00cec9" opacity="0.35">
                <animate attributeName="ry" values="15;20;15" dur="0.6s" repeatCount="indefinite" />
            </ellipse>
            {/* Exhaust particles */}
            <circle cx="63" cy="225" r="2" fill="#a29bfe" opacity="0.35">
                <animate attributeName="cy" values="225;265;225" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0;0.35" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="55" cy="235" r="1.5" fill="#00cec9" opacity="0.3">
                <animate attributeName="cy" values="235;275;235" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Star sparkles */}
            <circle cx="90" cy="55" r="1.5" fill="#00cec9" opacity="0.5">
                <animate attributeName="opacity" values="0.1;0.5;0.1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="30" cy="140" r="1.2" fill="#fd79a8" opacity="0.4">
                <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
        </svg>
    );

    return (
        <section className="features" id="features">
            <RocketRight />
            <div className="container">
                <div className="section-header reveal active" ref={ref}>
                    <span className="section-label">My Skills</span>
                    <h2>What I bring to the table</h2>
                    <p>A versatile skill set spanning design, development, and engineering excellence.</p>
                </div>
                <div className="features-grid stagger-children">
                    {features.map((f, i) => <FeatureCard key={i} {...f} />)}
                </div>
            </div>
        </section>
    );
}

function StatItem({ target, label, suffix = '+', delay = 0, index }) {
    const [val, ref] = useCounter(target, 2000, delay);
    const revRef = useScrollReveal();
    return (
        <div className="stat-item reveal" ref={e => { ref.current = e; revRef.current = e; }} style={{ transitionDelay: `${delay}ms` }}>
            <div className="stat-step-circle">{index + 1}</div>
            <div className="stat-number">{val}{suffix}</div>
            <div className="stat-label">{label}</div>
            <div className="stat-card-glow" />
        </div>
    );
}

function StatsSection() {
    return (
        <section className="stats">
            <div className="container">
                <div className="stats-relative-wrapper">
                    <div className="stats-line-container">
                        <div className="stats-line-bg"></div>
                        <div className="stats-line-progress"></div>
                        <div className="stats-moving-light light-1"></div>
                        <div className="stats-moving-light light-2"></div>
                        <div className="stats-moving-light light-3"></div>
                        <div className="stats-moving-light light-4"></div>
                    </div>
                    <div className="stats-grid">
                        <StatItem target={20} label="Projects Completed" index={0} delay={0} />
                        <StatItem target={95} label="Client Satisfaction" suffix="%" index={1} delay={200} />
                        <StatItem target={2} label="Years Experience" suffix="+" index={2} delay={400} />
                        <StatItem target={10} label="Happy Clients" index={3} delay={600} />
                    </div>
                </div>
            </div>
        </section>
    );
}

function WorkModal({ project, onClose }) {
    if (!project) return null;
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`project-detail-container ${project.theme === 'lab' ? 'theme-lab' : ''}`}>

                {project.showDecorations && <LabDecorations />}

                <button className="pd-back-btn magic-hover" onClick={onBack}>
                    ← Back
                </button>
                <h2>{project.title}</h2>
                <p>{project.fullDesc}</p>
                <div className="modal-tags">{project.tags.map((t, i) => <span key={i}>{t}</span>)}</div>
            </div>
        </div>
    );
}

/* ===== Components ===== */
// ... (Previous components: CursorGlow, Navbar, TypingText, HeroSection, FeatureCard, FeaturesSection, StatItem, StatsSection) ...
// Note: We need to move these components above or keep them here. 
// For this refactor, I'll structure the App to use them.

const GridCard = ({ card, index }) => {
    const ref = useScrollReveal();
    const tiltRef = useTilt({ max: 5, scale: 1.02 });

    return (
        <div
            className="pd-service-card reveal"
            style={{
                '--accent-color': card.color,
                transitionDelay: `${index * 50}ms`,
                padding: card.image ? '0' : '32px 24px', // Remove padding for image cards
                minHeight: card.image ? '300px' : 'auto', // Increase height for images
                display: 'flex',
                flexDirection: 'column'
            }}
            ref={(el) => {
                ref.current = el;
                tiltRef.current = el;
            }}
        >
            {card.image ? (
                <div style={{
                    width: '100%',
                    height: '100%',
                    flex: '1',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--card-bg)',
                    borderRadius: 'inherit'
                }}>
                    <img
                        src={card.image}
                        alt={card.title || 'Design'}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover', // Fill the card
                            display: 'block'
                        }}
                    />
                </div>
            ) : (
                <>
                    <div className="pd-service-icon-wrapper">
                        <span className="pd-service-icon">{card.icon}</span>
                    </div>
                    <h4 className="pd-service-title">{card.title}</h4>
                    <p className="pd-service-desc">{card.desc}</p>
                </>
            )}
        </div>
    );
};



const MasonryGallery = ({ section }) => {
    // Horizontal scroll layout (Museum Style)
    // No JS calculation needed for lines anymore as requested for "Layout geser"

    return (
        <div className="pd-section pd-horizontal-gallery">
            <div className="pd-poster-header">
                <h3>{section.title}</h3>
                <p className="pd-poster-description">{section.description}</p>
            </div>

            <div className="gallery-container">
                <div className="gallery-track">
                    {section.images.map((src, i) => (
                        <div className="gallery-item" key={i}>
                            <img
                                src={src}
                                alt={`Poster ${i + 1}`}
                                loading="lazy"
                                className="gallery-img"
                            />
                        </div>
                    ))}
                </div>
                {/* Scroll Hint */}
                <div className="scroll-hint">
                    <span>← SCROLL TO EXPLORE →</span>
                </div>
            </div>
        </div>
    );
};

// === Innovation Lab Components ===

const MagneticButton = ({ children, className, onClick }) => {
    const [style, setStyle] = useState({});

    const handleMouseMove = (e) => {
        const { clientX, clientY, currentTarget } = e;
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        const x = (clientX - (left + width / 2)) * 0.3;
        const y = (clientY - (top + height / 2)) * 0.3;
        setStyle({ transform: `translate(${x}px, ${y}px)` });
    };

    const handleMouseLeave = () => {
        setStyle({ transform: 'translate(0, 0)' });
    };

    return (
        <button
            className={`magnetic-btn ${className || ''}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            style={style}
        >
            <span className="btn-text">{children}</span>
            <div className="btn-fill" />
        </button>
    );
};

// === Innovation Lab Components ===

const LabVisualWrapper = ({ children, className }) => (
    <div className={`lab-visual-wrapper ${className || ''}`}>
        <div className="lab-visual-inner">
            {children}
        </div>
        <div className="lab-corner tl" />
        <div className="lab-corner tr" />
        <div className="lab-corner bl" />
        <div className="lab-corner br" />
    </div>
);

const TextDecodingCard = ({ title, subtitle, icon, delay, image }) => {
    // ... existing TextDecodingCard code ...

    const [displayText, setDisplayText] = useState(title);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

    const handleHover = () => {
        let iterations = 0;
        const interval = setInterval(() => {
            setDisplayText(title.split("").map((letter, index) => {
                if (index < iterations) return title[index];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join(""));
            if (iterations >= title.length) clearInterval(interval);
            iterations += 1 / 3;
        }, 30);
    };

    return (
        <div className="pd-feature-card theme-lab-card" onMouseEnter={handleHover} style={{ animationDelay: `${delay}ms` }}>
            <div className="lab-card-header">
                <span className="lab-icon">{icon}</span>
                <div className="lab-status-dot" />
            </div>
            <h3 className="txt-decode">{displayText}</h3>
            <p>{subtitle}</p>
            {image && (
                <div style={{ marginTop: '4px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0, 230, 118, 0.3)' }}>
                    <img src={image} alt={title} style={{ width: '100%', display: 'block', opacity: '0.8' }} />
                </div>
            )}
            <div className="lab-scanline" />
        </div>
    );
};

const RealityDistortionCard = ({ title, subtitle, icon, delay, image }) => {
    // Simplified specific effect for this card without heavy SVG filter for performance first
    // Using CSS transform perspective
    const [style, setStyle] = useState({});

    const handleMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xPct = (x / rect.width - 0.5) * 20; // -10 to 10 deg
        const yPct = (y / rect.height - 0.5) * -20;

        setStyle({
            transform: `perspective(1000px) rotateX(${yPct}deg) rotateY(${xPct}deg) scale(1.05)`,
            boxShadow: `${-xPct}px ${yPct}px 30px rgba(57, 255, 20, 0.2)`
        });
    };

    const handleLeave = () => {
        setStyle({ transform: 'perspective(1000px) rotateX(0) rotateY(0) scale(1)', boxShadow: 'none' });
    };

    return (
        <div
            className="pd-feature-card theme-lab-card distortion-card"
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ ...style, animationDelay: `${delay}ms`, transition: 'transform 0.1s' }}
        >
            <div className="lab-card-header">
                <span className="lab-icon">{icon}</span>
                <span className="lab-badge">PHYSICS_ENGINE</span>
            </div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
            {image && (
                <div style={{ marginTop: '4px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0, 230, 118, 0.3)', width: '50%', margin: '4px auto 0' }}>
                    <img src={image} alt={title} style={{ width: '100%', display: 'block', opacity: '0.8' }} />
                </div>
            )}
            <div className="liquid-distort" />
        </div>
    );
};

const GlitchSnapCard = ({ title, subtitle, icon, delay, image }) => {
    return (
        <div className="pd-feature-card theme-lab-card glitch-snap-card" style={{ animationDelay: `${delay}ms`, minHeight: '500px' }}>
            <div className="glitch-layer" style={{ backgroundImage: `url(${image})`, backgroundColor: '#1a1a1a', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="glitch-layer" style={{ backgroundImage: `url(${image})`, backgroundColor: '#1a1a1a', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="glitch-layer" style={{ backgroundImage: `url(${image})`, backgroundColor: '#1a1a1a', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

            <div className="lab-content-overlay">
                <div className="lab-card-header">
                    <span className="lab-icon">{icon}</span>
                    <span className="lab-badge">RECONSTRUCT</span>
                </div>
                <h3>{title}</h3>
                <p>{subtitle}</p>
            </div>
        </div>
    );
};

const InnovationLabSection = ({ section }) => {
    const ref = useScrollReveal();

    const [offsetY, setOffsetY] = useState(0);
    useEffect(() => {
        const handleScroll = () => setOffsetY(window.scrollY * 0.1);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const blocks = [
        {
            id: 1,
            title: "Analisis Kompleksitas",
            desc: "Program ini merupakan proyek analisis perbandingan performa Binary Search antara metode iteratif dan rekursif pada sistem data perpustakaan untuk mengukur efisiensi waktu eksekusi dan kompleksitas algoritma.",
            visual: <TextDecodingCard icon=">_" title="SYSTEM_ROOT" subtitle="Accessing Mainframe..." delay={0} image="assets/images/projects/rekrusifiteratif.png" />,
            align: 'left',
            tags: ['System', 'HTML', 'Golang'],
            sourceLink: 'https://github.com/wrldwideee/tubes-AKA-kompleksitas-binary-search-iteratif-rekursif-untuk-perpustakaan.git'
        },
        {
            id: 2,
            title: "PantryKeeper",
            desc: "Aplikasi manajemen kebutuhan rumah tangga berbasis Go ini dirancang untuk mendigitalisasi pencatatan stok dan inventaris harian agar pengelolaan barang di rumah menjadi lebih teratur dan terpantau dengan mudah.s",
            visual: <RealityDistortionCard icon="⚡" title="CMD CLI" subtitle="Distortion Field Active" delay={0} image="assets/images/projects/Motivation.png" />,
            align: 'right',
            tags: ['Program', 'Golang', 'CLI'],
            sourceLink: 'https://github.com/SyafiqSiregar/Tubes-1-aplikasi-manajemen-kebutuhan-rumah-tangga.git'
        },
        {
            id: 3,
            title: "Sistem Gudang",
            desc: "Proyek Tugas Besar Struktur Data ini menggunakan bahasa C++ untuk mengimplementasikan sistem manajemen berbasis Linked List guna mengelola relasi data secara dinamis dan efisien.",
            visual: <GlitchSnapCard icon="👁️" title="NEURAL_NET" subtitle="Reconstructing Signal..." delay={0} image="assets/images/projects/abcd.png" />,
            align: 'left',
            tags: ['Generative', 'C++', 'Struktur Data '],
            sourceLink: 'https://github.com/MyTrueSkillz01/tubes-strukdat.git'
        }
    ];

    return (
        <div className="pd-section reveal theme-lab" ref={ref}>
            <div className="lab-grid-bg" style={{ backgroundPositionY: `${offsetY}px` }} />

            <div className="pd-section-centered-header" style={{ marginBottom: '4rem' }}>
                <span className="pd-section-badge" style={{ borderColor: 'var(--lab-accent)', color: 'var(--lab-accent)' }}>EXPERIMENTAL ZONE</span>
                <h3 style={{ fontSize: '3.5rem', color: '#fff', minHeight: '1.2em' }}>
                    <TypingText
                        texts={["THE INNOVATION LAB"]}
                        speed={110}
                        pause={2000}
                        className="lab-glitch"
                    />
                </h3>
                <p style={{ fontFamily: 'monospace', color: 'var(--lab-accent)' }}>// [3] PROJECTS LOADED. SYSTEM READY.</p>
            </div>

            <div className="lab-blocks-container">
                {blocks.map((block, i) => (
                    <div key={i} className={`lab-project-block align-${block.align}`}>
                        <div className="lab-content-side">
                            <span className="lab-block-number">0{block.id}</span>
                            <h2 className="lab-block-title">{block.title}</h2>
                            <div className="lab-tags">
                                {block.tags.map((t, k) => <span key={k} className="lab-tag">{t}</span>)}
                            </div>
                            <p className="lab-block-desc">{block.desc}</p>
                            <div className="lab-actions">
                                <MagneticButton
                                    className="btn-lab-primary"
                                    onClick={() => block.sourceLink && window.open(block.sourceLink, '_blank')}
                                >
                                    VIEW SOURCE
                                </MagneticButton>
                                <MagneticButton className="btn-lab-secondary">LIVE DEMO</MagneticButton>
                            </div>
                        </div>
                        <div className="lab-visual-side">
                            <LabVisualWrapper>
                                {block.visual}
                            </LabVisualWrapper>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProjectOverview = ({ title, description, images }) => {
    const ref = useScrollReveal();
    const tilt = useTilt(); // Keeping tilt if user wants subtle movement later, or we can remove it to be purely static. Let's keep existing consistency but maybe disable it on the frames if requested "static". 
    // User asked for "animasi di sekitarnya saja", frame "biarkan saja". So I will NOT apply tilt to the frames directly, or apply very subtle.
    // Actually typically 'tilt' applies to the whole container. I'll apply it to the wrapper for a cool effect, or remove if "biarkan saja" implies "don't move".
    // "bagian frame nya biarkan saja" -> probably means "keep the frame design as is (from the file)" OR "don't animate the frame".
    // I will remove useTilt for the phones to be safe and strictly follow "biarkan saja" (let it be/leave it alone).

    const content = Array.isArray(description) ? description : [description];

    return (
        <div className="pd-section reveal" ref={ref}>
            <div className="pd-overview-wrapper">
                <div className="pd-overview-visual">
                    {/* Animated Background Elements */}
                    <div className="pd-visual-blob pulsing" />
                    <div className="pd-deco-item floating-1" style={{ top: '10%', right: '10%' }}>✦</div>
                    <div className="pd-deco-item floating-2" style={{ bottom: '20%', left: '5%' }}>●</div>

                    {/* Back Phone (Static) */}
                    <div className="pd-phone-wrapper pd-phone-back-final">
                        <img src="assets/images/frameHp/Syafiq.png" className="pd-frame-img" alt="Frame" />
                    </div>

                    {/* Front Phone (Static) */}
                    <div className="pd-phone-wrapper pd-phone-front-final">
                        <img src="assets/images/frameHp/Yusuf.png" className="pd-frame-img" alt="Frame" />
                    </div>
                </div>

                <div className="pd-overview-content">
                    <h2 className="pd-overview-title">{title}</h2>
                    <div className="pd-overview-text">
                        {content.map((text, i) => (
                            <React.Fragment key={i}>
                                <p>{text}</p>
                                {i < content.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                        <br />
                        <a href="https://www.figma.com/design/v6E1HZXROgJfe989CphzCv/BantuIn?node-id=1008-14452&t=QS2WF0tnN40swE6W-1" target="_blank" rel="noopener noreferrer" className="btn-small-view">
                            <span>View Full Design</span>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProjectSection = ({ section, index }) => {
    const sRef = useScrollReveal();

    if (section.type === 'project-overview') {
        return <ProjectOverview {...section} />;
    }

    if (section.type === 'masonry-gallery') {
        return (
            <div className="pd-section reveal" ref={sRef}>
                <MasonryGallery section={section} />
            </div>
        );
    }

    if (section.type === 'design-gallery') {
        return (
            <div className="pd-section reveal" ref={sRef}>
                <div className="pd-section-centered-header">
                    <h3 className="pd-large-title">{section.title}</h3>
                </div>
                <div className="pd-features-grid stagger-children">
                    {section.items.map((item, j) => (
                        <DesignFeatureCard
                            key={j}
                            image={item.image}
                            title={item.title}
                            desc={item.desc}
                            delay={item.delay || j * 100}
                            accentColor={['#a29bfe', '#6c5ce7', '#00cec9', '#fd79a8'][j % 4]}
                            className={item.title === 'Personal Branding' ? 'pd-last-center' : ''}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (section.title === 'Desain Poster & UMKM') {
        return (
            <div className="pd-section reveal" ref={sRef}>
                <div className="pd-umkm-showcase">
                    <div className="pd-umkm-left">
                        <div className="pd-umkm-title-box">
                            <h1>DESAIN</h1>
                            <h2>DESAIN</h2>
                            <p>Desain Poster & UMKM</p>
                        </div>
                        <div className="pd-umkm-wide-img">
                            {/* First card (index 0) is the wide one */}
                            <img src={section.cards[0].image} alt="Wide Banner" />
                        </div>
                    </div>
                    {/* Next 3 cards are verticals */}
                    {section.cards.slice(1).map((card, j) => (
                        <div key={j} className="pd-umkm-vertical-img">
                            <img src={card.image} alt={`Design ${j + 1}`} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (section.type === 'grid-cards') {
        return (
            <div className="pd-section reveal" ref={sRef}>
                <div className="pd-section-centered-header">
                    {section.badge && <span className="pd-section-badge">{section.badge}</span>}
                    <h3 className={['Review UI/UX Seabank'].includes(section.title) ? 'text-gradient-seabank' : ''}>{section.title}</h3>
                </div>
                <div className="pd-grid-cards">
                    {section.cards.map((card, j) => (
                        <GridCard key={j} card={card} index={j} />
                    ))}
                </div>
            </div>
        );
    }

    if (section.type === 'innovation-lab') {
        return <InnovationLabSection section={section} />;
    }

    return (
        <div className="pd-section reveal" ref={sRef}>
            <div className="pd-section-header">
                <span className="pd-section-number">{String(index + 3).padStart(2, '0')}</span>
                <h3>{section.title}</h3>
            </div>
            <div className="pd-section-divider" />
            {section.desc && <p className="pd-description">{section.desc}</p>}
            {section.items && (
                <div className="pd-items-list">
                    {section.items.map((item, j) => (
                        <div key={j} className="pd-item">
                            <span className="pd-item-bullet">▹</span>
                            <span>{item}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function ProjectDetail({ project, onBack }) {
    const [scrolled, setScrolled] = useState(false);
    const [showTop, setShowTop] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        const handler = () => {
            setScrolled(window.scrollY > 50);
            setShowTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    if (!project) return null;

    const headerRef = useScrollReveal();
    const imageRef = useScrollReveal();
    const aboutRef = useScrollReveal();
    const metaRef = useScrollReveal();
    const featuresRef = useScrollReveal();
    const resultsRef = useScrollReveal();
    const ctaRef = useScrollReveal();
    const tiltRef = useTilt();

    return (
        <div className="project-detail">
            <div className="pd-bg-glow pd-glow-1" />
            <div className="pd-bg-glow pd-glow-2" />

            <Navbar scrolled={scrolled} />
            <div className={`project-detail-container ${project.theme === 'lab' ? 'theme-lab' : ''}`}>

                {project.showDecorations && <LabDecorations />}
                {project.showScanner && <ScanlineOverlay />}
                {project.showMeteors && <CyberMeteorRain />}

                <button onClick={onBack} className="btn-secondary back-btn pd-back-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                    Back to Home
                </button>

                {!project.hideHeader && (
                    <div className="pd-hero reveal" ref={headerRef}>
                        <div className="pd-tags">
                            {project.tags.map((tag, i) => (
                                <span key={i} className="pd-tag">{tag}</span>
                            ))}
                        </div>
                        <h1 className="pd-title">{project.title}</h1>
                        <p className="pd-subtitle">{project.desc}</p>
                    </div>
                )}

                {!project.hideCover && (
                    <div className={`pd-image-showcase reveal${project.image ? ' has-image' : ''}`} ref={imageRef}>
                        <div className="pd-image-wrapper tilt-card" ref={tiltRef}>
                            <div className="card-shine" />
                            {project.image ? <img src={project.image} alt={project.title} /> : <span className="pd-image-icon">{project.icon}</span>}
                        </div>
                    </div>
                )}

                {!project.hideMeta && (project.role || project.techStack) && (
                    <div className="pd-meta-section reveal" ref={metaRef}>
                        <div className="pd-meta-grid">
                            {project.role && (
                                <div className="pd-meta-card" style={{ animationDelay: '0ms' }}>
                                    <span className="pd-meta-badge">1</span>
                                    <div className="pd-meta-corner pd-corner-tl" />
                                    <div className="pd-meta-corner pd-corner-br" />
                                    <div className="pd-meta-icon">👤</div>
                                    <span className="pd-meta-label">My Role</span>
                                    <span className="pd-meta-value">{project.role}</span>
                                </div>
                            )}
                            <div className="pd-meta-connector">
                                <div className="pd-connector-line" />
                                <div className="pd-connector-dot" style={{ animationDelay: '0s' }} />
                                <div className="pd-connector-dot pd-dot-reverse" style={{ animationDelay: '1.5s' }} />
                            </div>
                            {project.techStack && (
                                <div className="pd-meta-card" style={{ animationDelay: '120ms' }}>
                                    <span className="pd-meta-badge">2</span>
                                    <div className="pd-meta-corner pd-corner-tl" />
                                    <div className="pd-meta-corner pd-corner-br" />
                                    <div className="pd-meta-icon">🛠️</div>
                                    <span className="pd-meta-label">Tech Stack</span>
                                    <span className="pd-meta-value">{project.techStack.join(', ')}</span>
                                </div>
                            )}
                            <div className="pd-meta-connector">
                                <div className="pd-connector-line" />
                                <div className="pd-connector-dot" style={{ animationDelay: '0.5s' }} />
                                <div className="pd-connector-dot pd-dot-reverse" style={{ animationDelay: '2s' }} />
                            </div>
                            {project.client && (
                                <div className="pd-meta-card" style={{ animationDelay: '240ms' }}>
                                    <span className="pd-meta-badge">3</span>
                                    <div className="pd-meta-corner pd-corner-tl" />
                                    <div className="pd-meta-corner pd-corner-br" />
                                    <div className="pd-meta-icon">🏢</div>
                                    <span className="pd-meta-label">Client</span>
                                    <span className="pd-meta-value">{project.client}</span>
                                </div>
                            )}
                            <div className="pd-meta-connector">
                                <div className="pd-connector-line" />
                                <div className="pd-connector-dot" style={{ animationDelay: '1s' }} />
                                <div className="pd-connector-dot pd-dot-reverse" style={{ animationDelay: '2.5s' }} />
                            </div>
                            {project.year && (
                                <div className="pd-meta-card" style={{ animationDelay: '360ms' }}>
                                    <span className="pd-meta-badge">4</span>
                                    <div className="pd-meta-corner pd-corner-tl" />
                                    <div className="pd-meta-corner pd-corner-br" />
                                    <div className="pd-meta-icon">📅</div>
                                    <span className="pd-meta-label">Year</span>
                                    <span className="pd-meta-value">{project.year}</span>
                                </div>
                            )}
                        </div>
                        {/* Floating particles */}
                        <div className="pd-meta-particles">
                            <div className="pd-particle" style={{ left: '10%', animationDelay: '0s', animationDuration: '4s' }} />
                            <div className="pd-particle" style={{ left: '30%', animationDelay: '1s', animationDuration: '5s' }} />
                            <div className="pd-particle" style={{ left: '55%', animationDelay: '2s', animationDuration: '3.5s' }} />
                            <div className="pd-particle" style={{ left: '75%', animationDelay: '0.5s', animationDuration: '4.5s' }} />
                            <div className="pd-particle" style={{ left: '90%', animationDelay: '1.5s', animationDuration: '3s' }} />
                            <div className="pd-particle pd-particle-teal" style={{ left: '20%', animationDelay: '2.5s', animationDuration: '5s' }} />
                            <div className="pd-particle pd-particle-teal" style={{ left: '65%', animationDelay: '0.8s', animationDuration: '4s' }} />
                            <div className="pd-particle pd-particle-teal" style={{ left: '85%', animationDelay: '1.8s', animationDuration: '3.5s' }} />
                        </div>
                    </div>
                )}

                {project.fullDesc && (
                    <div className="pd-section reveal" ref={aboutRef}>
                        <div className="pd-section-header">
                            <span className="pd-section-number">01</span>
                            <h3>About the Project</h3>
                        </div>
                        <div className="pd-section-divider" />
                        <p className="pd-description">{project.fullDesc}</p>
                    </div>
                )}

                {project.features && (
                    <div className="pd-section reveal" ref={featuresRef}>
                        <div className="pd-section-header">
                            <span className="pd-section-number">02</span>
                            <h3>Key Features</h3>
                        </div>
                        <div className="pd-section-divider" />
                        <div className="pd-features-grid">
                            {project.features.map((f, i) => (
                                <div key={i} className="pd-feature-card" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="pd-feature-icon-wrap">
                                        <span>{f.icon}</span>
                                    </div>
                                    <strong>{f.title}</strong>
                                    <p>{f.desc}</p>
                                    <div className="pd-feature-glow" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}



                {project.sections && project.sections.map((section, i) => (
                    <ProjectSection key={i} section={section} index={i} />
                ))}

                {project.showKernel && <SystemKernelSection />}

                {project.showLogs ? (
                    <ExperimentLogsSection logs={project.logs} />
                ) : (
                    project.results && (
                        <div className="pd-section pd-results-section reveal" ref={resultsRef}>
                            <div className="pd-section-header">
                                <span className="pd-section-number">{String((project.sections?.length || 0) + 3).padStart(2, '0')}</span>
                                <h3>Results & Impact</h3>
                            </div>
                            <div className="pd-section-divider" />
                            <div className="pd-results-grid">
                                {project.results.map((r, i) => (
                                    <div key={i} className="pd-result-item">
                                        <span className="pd-result-check">✓</span>
                                        <span>{r}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}

                {project.showHoloCTA ? (
                    <HoloCTASection onBack={onBack} />
                ) : (
                    <div className="pd-bottom-cta reveal" ref={ctaRef}>
                        <p>Interested in this project?</p>
                        <div className="pd-bottom-actions">
                            {project.liveUrl && (
                                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-primary magic-hover pd-live-btn">
                                    <span className="btn-text">🌐 Visit Site</span>
                                </a>
                            )}
                            <button onClick={onBack} className="btn-secondary">← View More Projects</button>
                        </div>
                    </div>
                )}
            </div>
            <Footer />
            <ScrollToTop visible={showTop} />
        </div>
    );
}


function Home({ onProjectClick }) {
    const [scrolled, setScrolled] = useState(false);
    const [showTop, setShowTop] = useState(false);

    useEffect(() => {
        const handler = () => {
            setScrolled(window.scrollY > 50);
            setShowTop(window.scrollY > 600);
        };
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    return (
        <>
            <ThreeParticles />
            <div className="bg-orbs"><div className="orb" /><div className="orb" /><div className="orb" /></div>
            <CursorGlow />
            <Navbar scrolled={scrolled} />
            <HeroSection />
            <FeaturesSection />
            <StatsSection />
            <ExperienceSection />
            <WorkSection onProjectClick={onProjectClick} />
            <TestimonialsSection />
            <CTASection />
            <Footer />
            <ScrollToTop visible={showTop} />
        </>
    );
}

function WorkSection({ onProjectClick }) {
    const ref = useScrollReveal();


    const projects = [
        {
            icon: '📷',
            title: 'RetinaCCTV Website',
            theme: 'tech',
            tags: ['Landing Page', 'WordPress', 'UI/UX'],
            desc: 'Company profile untuk perusahaan jasa instalasi CCTV & security system.',
            fullDesc: 'Website company profile CV. RetinaCCTV dirancang dengan pendekatan UI/UX untuk menghadirkan tampilan modern, responsif, dan user-friendly. Navigasi sederhana, struktur konten yang jelas, serta CTA yang strategis mempermudah calon klien menemukan informasi layanan dan portofolio dengan cepat. Fokus desain ini bertujuan meningkatkan pengalaman pengguna sekaligus memperkuat identitas brand perusahaan.',
            image: 'assets/images/projects/adsa.png',
            thumbnail: 'assets/images/projects/logoRetina.webp',
            useContain: true,
            liveUrl: 'https://retinacctv.id',
            role: 'UI/UX Designer & Web Developer',
            client: 'CV. RetinaCCTV',
            year: '2024',
            techStack: ['WordPress', 'Elementor', 'CSS', 'UI/UX Design'],
            features: [
                { icon: '🎨', title: 'Desain Modern & Responsif', desc: 'Tampilan profesional dengan dark theme yang elegan, responsif di semua perangkat.' },
                { icon: '📱', title: 'Mobile-Friendly', desc: 'Layout yang optimal di mobile, memudahkan calon klien mengakses dari smartphone.' },
                { icon: '💬', title: 'CTA ke WhatsApp', desc: 'Tombol CTA strategis yang langsung mengarahkan pengunjung ke WhatsApp untuk konsultasi.' },
                { icon: '💰', title: 'Pricing Packages', desc: 'Paket harga transparan: WiFi Camera (Rp 800rb), Analog (Rp 2.5jt), dan IP Camera (Rp 3.5jt).' },
                { icon: '👥', title: 'Team Showcase', desc: 'Profil tim ahli yang membangun kepercayaan klien terhadap profesionalitas perusahaan.' },
                { icon: '⭐', title: 'Testimonial Section', desc: 'Ulasan klien nyata yang memperkuat kredibilitas dan social proof perusahaan.' },
            ],
            sections: [
                {
                    type: 'grid-cards',
                    badge: 'LAYANAN KAMI',
                    title: 'Layanan yang Ditampilkan',
                    cards: [
                        { icon: '🔧', color: '#00cec9', title: 'Instalasi CCTV', desc: 'Pemasangan profesional untuk area indoor & outdoor.' },
                        { icon: '📦', color: '#fd79a8', title: 'Penjualan Perangkat', desc: 'DVR/NVR, kamera, kabel, dan aksesoris pendukung.' },
                        { icon: '🛠️', color: '#6c5ce7', title: 'Pemeliharaan & Servis', desc: 'Perawatan rutin, troubleshooting, dan perbaikan.' },
                        { icon: '📋', color: '#a29bfe', title: 'Konsultasi & Survey Lokasi', desc: 'Layanan konsultasi gratis untuk solusi pengawasan terbaik.' },
                    ]
                },
                {
                    type: 'grid-cards',
                    title: 'Pendekatan Desain',
                    cards: [
                        { icon: '🧭', color: '#0984e3', title: 'Navigasi Intuitif', desc: 'Navigasi sederhana untuk memudahkan pencarian informasi.' },
                        { icon: '📐', color: '#6c5ce7', title: 'Hierarki Visual', desc: 'Struktur konten yang jelas dengan hierarki visual yang kuat.' },
                        { icon: '👆', color: '#00cec9', title: 'CTA Strategis', desc: 'Penempatan tombol aksi yang optimal untuk mendorong konversi.' },
                        { icon: '🖼️', color: '#fd79a8', title: 'Showcase Portofolio', desc: 'Galeri instalasi untuk membangun kepercayaan klien.' },
                        { icon: '📝', color: '#e17055', title: 'Edukasi & SEO', desc: 'Artikel CCTV untuk edukasi pengunjung dan performa SEO.' },
                    ]
                },
            ],
            results: [
                'Meningkatkan online presence dan identitas brand RetinaCCTV',
                'Memudahkan calon klien menemukan informasi layanan dan portofolio',
                'Menyediakan channel konversi langsung melalui integrasi WhatsApp',
                'Memperkuat kepercayaan klien melalui testimonial dan profil tim',
            ],
        },
        {
            icon: '💻',
            title: 'RetinaCCTV Pro System',
            theme: 'tech',
            tags: ['Web App', 'Inventory', 'POS'],
            desc: 'Sistem manajemen inventaris dan kasir berbasis cloud-serverless yang terintegrasi penuh, dirancang untuk meminimalisir human error dalam pelacakan Serial Number (SN).',
            fullDesc: 'RetinaCCTV Pro adalah solusi perangkat lunak kustom yang dibangun untuk mengatasi masalah manajemen stok barang elektronik yang memiliki identitas unik (Serial Number/SN). Aplikasi ini menggabungkan dua fungsi vital: Manajemen Gudang (Back Office) dan Mesin Kasir (Front Office/POS) dalam satu database terpusat.\n\nSistem ini mengubah Google Spreadsheet menjadi database relasional yang kuat, diakses melalui antarmuka web modern yang responsif. Fokus utama pengembangan adalah pada kecepatan input data melalui barcode scanner, validasi data ganda otomatis untuk mencegah kerugian aset, serta pencatatan transaksi penjualan yang akurat dengan perhitungan PPN otomatis dan pencetakan struk termal.',
            image: 'assets/images/projects/card2.png',
            thumbnail: 'assets/images/projects/card2.png',
            isCover: true,
            liveUrl: 'https://github.com/SyafiqSiregar/RetinaCCTV-Pro-System.git',
            role: 'Full Stack Developer (Konseptor Sistem, UI/UX Designer)',
            client: 'CV RETINA PERISAI NUSANTARA',
            year: '2026',
            techStack: ['Google Apps Script', 'Google Sheets', 'HTML', 'CSS'],
            features: [
                { icon: '🔀', title: 'Dual-Interface System', desc: 'Pemisahan akses UI antara Admin Gudang (Manajemen Stok) dan Kasir (Penjualan) melalui satu URL dinamis, menjaga keamanan akses fitur.' },
                { icon: '📡', title: 'Smart Barcode Scanning', desc: 'Alur kerja input "Scan-to-Action". Scan Part Number (PN) otomatis mendeteksi nama barang, dan Scan Serial Number (SN) memvalidasi keaslian stok.' },
                { icon: '🧾', title: 'Advanced POS with Tax Logic', desc: 'Mesin kasir dengan fitur keranjang belanja, kalkulasi otomatis PPN 10%, hitung kembalian, dan direct printing ke printer thermal (58mm/80mm).' },
                { icon: '🛡️', title: 'Anti-Duplication Security', desc: 'Algoritma validasi ketat yang menolak input SN yang sama pada barang masuk, atau menjual barang yang SN-nya belum terdaftar di gudang.' },
                { icon: '🔐', title: 'Keamanan & Backup Data', desc: 'Fitur destruktif dilindungi Double Authentication. Auto backup satu klik ke .xlsx dengan pengecualian sheet User untuk privasi.' },
                { icon: '📊', title: 'Dashboard & Visualisasi', desc: 'Visualisasi data stok dan penjualan real-time menggunakan Chart.js untuk membantu pengambilan keputusan bisnis.' },
            ],
            sections: [
                {
                    type: 'grid-cards',
                    badge: 'ARSITEKTUR',
                    title: 'Arsitektur & Teknologi Sistem',
                    cards: [
                        { icon: '☁️', color: '#0984e3', title: 'Serverless Google', desc: 'Backend dibangun di atas Google Apps Script sebagai API, mengubah biaya server menjadi Rp 0,-.' },
                        { icon: '📋', color: '#6c5ce7', title: 'Spreadsheet as DB', desc: 'Google Sheets sebagai database relasional real-time dengan tabel terpisah untuk Master Barang, Riwayat, Penjualan, Supplier, dan User.' },
                        { icon: '🖥️', color: '#00cec9', title: 'Modern Web UI', desc: 'Frontend responsif dengan HTML5, Bootstrap 5, DataTables untuk tabel interaktif, dan SweetAlert2 untuk UX yang menyenangkan.' },
                        { icon: '🔗', color: '#fd79a8', title: 'Google Drive API', desc: 'Integrasi penuh dengan ekosistem Google untuk penyimpanan, autentikasi, dan pengelolaan file.' },
                    ]
                },
                {
                    type: 'grid-cards',
                    title: 'Smart Workflow & UX',
                    cards: [
                        { icon: '🎯', color: '#e17055', title: 'Auto-Focus & Auto-Select', desc: 'Scan barcode PN, kursor otomatis melompat ke kolom berikutnya tanpa sentuh mouse.' },
                        { icon: '🔒', color: '#0984e3', title: 'Read-Only Safety', desc: 'Qty dikunci di "1" pada mode SN, memaksa scan per unit untuk akurasi 100%.' },
                        { icon: '📦', color: '#6c5ce7', title: 'Supplier Tracking', desc: 'Scan di kasir otomatis menampilkan asal Supplier dari data historis penerimaan, memudahkan klaim garansi.' },
                        { icon: '🖨️', color: '#00cec9', title: 'Split View POS', desc: 'Panel Transaksi (kiri) dengan kalkulasi real-time dan Keranjang Belanja (kanan) dengan thermal printing CSS.' },
                    ]
                },
            ],
            results: [
                'Efisiensi Biaya: Mengurangi biaya infrastruktur server menjadi Rp 0,- dengan memanfaatkan ekosistem Google',
                'Akurasi Data: Mengeliminasi 99% kesalahan input data ganda atau penjualan barang "hantu"',
                'Kecepatan Operasional: Mempercepat proses stok opname dan transaksi kasir hingga 3x lipat dibandingkan metode manual',
            ],
        },
        {
            icon: '🎨',
            title: 'Galleri Design Portfolio',
            theme: 'design',
            tags: ['Graphic Design', 'Branding', 'Visual Art'],
            desc: 'Koleksi karya desain visual, poster, dan identitas brand dengan estetika futuristik.',
            fullDesc: 'Sebuah showcase dari eksplorasi visual dan proyek desain grafis yang menggabungkan prinsip desain modern dengan sentuhan artistik. Portofolio ini mencakup berbagai media mulai dari poster acara, materi branding, hingga antarmuka pengguna eksperimental, semuanya dirancang untuk menyampaikan pesan yang kuat melalui visual yang memikat.',
            image: 'assets/images/projects/ke 3.png',
            thumbnail: 'assets/images/projects/ke 3.png',
            isCover: true,
            liveUrl: '#',
            role: 'Graphic Designer & Visual Artist',
            client: 'Various Clients',
            year: '2023 - Present',
            techStack: ['Photoshop', 'Illustrator', 'Figma', 'Blender'],
            features: [
                { icon: '✨', title: 'Visual Storytelling', desc: 'Menyampaikan narasi kompleks melalui komposisi visual yang intuitif dan emosional.' },
                { icon: '🎭', title: 'Brand Identity', desc: 'Membangun karakter brand yang kuat dan konsisten di berbagai touchpoint visual.' },
            ],
            sections: [
                {
                    type: 'grid-cards',
                    title: 'Review UI/UX Seabank',
                    cards: [
                        { image: 'assets/images/Review uiux/1.png', color: '#6c5ce7' },
                        { image: 'assets/images/Review uiux/2.png', color: '#0984e3' },
                        { image: 'assets/images/Review uiux/3.png', color: '#00cec9' },
                        { image: 'assets/images/Review uiux/4.png', color: '#fd79a8' },
                        { image: 'assets/images/Review uiux/5.png', color: '#a29bfe' },
                        { image: 'assets/images/Review uiux/6.png', color: '#e17055' },
                    ]
                },
                {
                    type: 'grid-cards',
                    title: 'Desain Poster & UMKM',
                    cards: [
                        { image: 'assets/images/UMKM/15.png', color: '#6c5ce7' },
                        { image: 'assets/images/UMKM/16.png', color: '#0984e3' },
                        { image: 'assets/images/UMKM/17.png', color: '#00cec9' },
                        { image: 'assets/images/UMKM/18.png', color: '#fd79a8' },
                    ]
                },
                {
                    type: 'project-overview',
                    title: 'Project BantuIN',
                    description: [
                        'BantuIn adalah aplikasi mobile on-demand yang dirancang untuk menjembatani mahasiswa yang memiliki jadwal padat dengan mahasiswa yang membutuhkan penghasilan tambahan secara fleksibel di lingkungan kampus.',
                        'Proyek ini dibuat karena proses bantuan masih dilakukan secara manual, tidak terorganisir, dan terbatas pada lingkup pertemanan. Hal ini membuat banyak potensi kolaborasi dan peluang ekonomi mahasiswa tidak terserap secara optimal.',
                        'Melalui sistem peran ganda, negosiasi harga, dan verifikasi pengguna, BantuIn menghadirkan ekosistem jasa kampus yang praktis, aman, dan saling menguntungkan.'
                    ],
                    images: ['assets/images/projects/card2.png', 'assets/images/projects/card2.png'] // Using existing images as placeholders
                },
                {
                    type: 'masonry-gallery',
                    title: 'Poster Collection',
                    description: 'Seri desain poster eksperimental dengan komposisi dinamis.',
                    images: [
                        'assets/images/Poster/1.png',
                        'assets/images/Poster/2.png',
                        'assets/images/Poster/3.png',
                        'assets/images/Poster/4.png',
                        'assets/images/Poster/5.png',
                        'assets/images/Poster/6.png',
                        'assets/images/Poster/7.png',
                        'assets/images/Poster/8.png',
                        'assets/images/Poster/9.png',
                        'assets/images/Poster/10.png',
                    ]
                },
                {
                    type: 'design-gallery',
                    title: 'Selected Works',
                    items: [
                        { image: 'assets/images/projects/card2.png', title: 'Futuristic Event Poster', desc: 'Poster acara musik elektronik dengan tipografi kustom dan elemen 3D neon.', delay: 0 },
                        { image: 'assets/images/projects/adsa.png', title: 'Tech Startup Branding', desc: 'Identitas visual lengkap untuk startup teknologi, termasuk logo dan social media kit.', delay: 100 },
                        { image: 'assets/images/projects/iventory system.png', title: 'Dashboard UI Concept', desc: 'Eksperimen antarmuka pengguna untuk sistem manajemen data yang kompleks.', delay: 200 },
                        // Add more placeholders to show the grid effect
                        { image: 'assets/images/profile/profile.jpeg', title: 'Personal Branding', desc: 'Eksplorasi visual personal branding dengan gaya fotografi modern.', delay: 300 },
                    ]
                }
            ],
            results: [
                'Meningkatkan engagement visual pada media sosial klien hingga 150%',
                'Menciptakan identitas visual yang unik dan mudah diingat',
                'Menyampaikan pesan marketing dengan lebih efektif melalui desain',
            ],
        },
        {
            icon: '🧪',
            title: 'The Innovation Lab',
            theme: 'lab',
            tags: ['Experimental', 'Creative Coding', 'Interactive'],
            desc: 'Kompilasi proyek eksperimental dengan interaksi "Next-Gen" dan visual cyber-industrial.',
            desc: 'Kompilasi proyek eksperimental dengan interaksi "Next-Gen" dan visual cyber-industrial.',
            // fullDesc removed to hide "About" section
            image: 'assets/images/profile/akuu.png',
            thumbnail: 'assets/images/profile/akuu.png',
            isCover: true,
            liveUrl: '#',
            hideCover: true,
            hideMeta: true,
            hideHeader: true,
            showKernel: true,
            showLogs: true,
            showHoloCTA: true,
            showDecorations: true,
            showScanner: true,
            showMeteors: true,
            logs: [
                { id: 'LOG_01', status: 'SUCCESS', msg: 'Immersive web experience achieved.', metric: 'Latency: 16ms | FPS: 60' },
                { id: 'LOG_02', status: 'SUCCESS', msg: 'Browser rendering capabilities exhausted.', metric: 'WebGL Context: Active | Shaders: Optimized' },
                { id: 'LOG_03', status: 'DATA', msg: 'User engagement metrics exceeded baseline.', metric: 'Session Duration: +140%' }
            ],
            role: 'Creative Technologist',
            client: 'Personal R&D',
            year: '2024 - Present',
            techStack: ['React', 'Three.js', 'WebGL', 'GLSL'],
            // features removed to hide "Key Features" section
            sections: [
                {
                    type: 'innovation-lab',
                    title: 'Lab Experiments',
                }
            ],
            results: ['Menciptakan pengalaman web yang immersive', 'Eksplorasi batas kemampuan browser modern'],
        },
    ];
    return (
        <section className="work" id="work">
            <div className="container">
                <div className="section-header reveal active" ref={ref}>
                    <span className="section-label">Portfolio</span>
                    <h2>Selected projects</h2>
                    <p>A curated selection of my finest work across industries and platforms.</p>
                </div>
                <div className="work-grid stagger-children">
                    {projects.map((p, i) => {
                        const r = useScrollReveal();
                        const t = useTilt();
                        return (
                            <div key={i} className={`work-card reveal tilt-card theme-${p.theme || 'default'}`} ref={e => { r.current = e; t.current = e; }} onClick={() => onProjectClick(p)}>
                                <div className="card-shine" />
                                <div className={`work-card-image${p.isCover ? ' cover-mode' : ''}${p.useContain ? ' contain-mode' : ''}`}>
                                    {p.thumbnail ? (
                                        <img src={p.thumbnail} alt={p.title} />
                                    ) : (
                                        <div className="placeholder">{p.icon}</div>
                                    )}
                                </div>
                                <div className="work-card-info">
                                    <div className="work-card-tags">{p.tags.map((t, j) => <span key={j}>{t}</span>)}</div>
                                    <h3>{p.title}</h3><p>{p.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}


function ExperienceSection() {
    const ref = useScrollReveal();
    const wrapperRef = useScrollReveal();
    const containerRef = useRef(null);

    const experiences = [
        {
            year: "2022 - 2023",
            role: "Dekorasi & Dokumentasi",
            company: "OSIS SMA 1 Tumijajar",
            type: "Organisasi",
            desc: [
                "Membuat dan mengelola konten tentang kegiatan keanggotan OSIS sehari-hari.",
                "Mengedit konten, membuat naskah dan membantu mempublikasi kegiatan OSIS."
            ],
            color: "#6c5ce7"
        },
        {
            year: "2023 - Sekarang",
            role: "Freelance Dev & Designer",
            company: "Freelance",
            type: "Freelance",
            desc: [
                "Mengembangkan solusi web dan perangkat lunak kustom untuk berbagai klien.",
                "Membuat desain grafis profesional untuk kebutuhan branding dan promosi."
            ],
            roles: ["Web Dev", "Desain Grafis"],
            color: "#00cec9"
        },
        {
            year: "2024",
            role: "Junior Web Developer",
            company: "CV. Retina Perisai Nusantara",
            type: "Magang",
            desc: [
                "Berkolaborasi dengan tim desain untuk mengimplementasikan UI/UX yang responsif.",
                "Menentukan desain, tataletak serta mengimplementasikannya kedalam Company Profile."
            ],
            color: "#0984e3"
        },
        {
            year: "2024 - Sekarang",
            role: "Creative & Marketing",
            company: "CV. Retina Perisai Nusantara",
            type: "Full-time",
            desc: [
                "Membuat konsep dan konten kreatif untuk kebutuhan promosi perusahaan.",
                "Berkolaborasi dengan tim untuk menghadirkan ide kampanye yang inovatif dan efektif."
            ],
            color: "#fd79a8"
        },
        {
            year: "2025 - 2026",
            role: "Intern",
            company: "Motion Laboratory",
            type: "Lab Kampus",
            desc: [
                "Mengikuti program studi intensif selama 10 minggu yang berfokus pada pendalaman materi teknis dan praktikum.",
                "Menyelesaikan serangkaian tugas mingguan dan final project untuk mengasah kemampuan problem-solving dan kolaborasi tim."
            ],
            color: "#e67e22"
        }
    ];

    return (
        <section className="experience-section" id="experience">
            <div className="container">
                <div className="section-header reveal active" ref={ref}>
                    <span className="section-label">Jejak Karir</span>
                    <h2>Pengalaman Kerja</h2>
                    <p>Jejak perjalanan profesional dan kontribusi dalam industri teknologi.</p>
                </div>

                <div className="exp-scroll-wrapper reveal" ref={wrapperRef}>
                    <div className="exp-track" ref={containerRef}>
                        {experiences.map((exp, i) => (
                            <div key={i} className="exp-card" style={{ '--accent-color': exp.color }}>
                                <div className="exp-header">
                                    <span className="exp-year">{exp.year}</span>
                                    <div className="exp-type">{exp.type}</div>
                                </div>
                                <div className="exp-content">
                                    <h3 className="exp-role">{exp.role}</h3>
                                    <h4 className="exp-company">
                                        <span className="exp-icon">🏢</span> {exp.company}
                                    </h4>
                                    {exp.roles && (
                                        <div className="exp-tags">
                                            {exp.roles.map((r, k) => <span key={k} className="exp-tag">{r}</span>)}
                                        </div>
                                    )}
                                    <ul className="exp-desc">
                                        {exp.desc.map((d, j) => (
                                            <li key={j}>{d}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="exp-visual-line" />
                                <div className="exp-corner tl" />
                                <div className="exp-corner br" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}


function TestimonialsSection() {
    const ref = useScrollReveal();
    const testimonials = [
        { image: 'assets/images/profile/Reidwa.jpg', initial: 'A', name: 'Ridwan Luthfi Siregar', role: 'CEO, RetinaCCTV', quote: '"Sumpah keren banget hasil kerjaan Syafiq. Awalnya cuma visi doang, eh disulap jadi produk yang kece parah. Detailnya juara!"' },
        { image: 'assets/images/profile/Yasir.jpg', initial: 'Y', name: 'Yasir Harahap', role: 'Owner, Princepremuimsosmed', quote: '"Wah, skill-nya Syafiq emang beda level sih. Teknisnya jago, hasilnya smooth, pokoknya mantap banget buat diajak kolab!"' },
        { image: 'assets/images/profile/Nur.jpg', initial: 'M', name: 'Nur Diansyah', role: 'Pengelola, Nata coffee', quote: '"Kerja bareng Syafiq tuh santai tapi hasilnya gila. Banyak ide baru yang gak kepikiran sama kita, tau-tau udah jadi dan keren abis."' },
    ];
    return (
        <section className="testimonials" id="testimonials">
            <div className="container">
                <div className="section-header reveal active" ref={ref}>
                    <span className="section-label">Testimoni</span>
                    <h2>Kata Mereka</h2>
                    <p>Pendapat dari orang-orang hebat yang pernah bekerja sama dengan saya.</p>
                </div>
                <div className="testimonials-grid stagger-children">
                    {testimonials.map((t, i) => {
                        const r = useScrollReveal();
                        return (
                            <div key={i} className="testimonial-card reveal" ref={r}>
                                <div className="testimonial-stars">★★★★★</div>
                                <blockquote>{t.quote}</blockquote>
                                <div className="testimonial-author">
                                    <div className="testimonial-avatar">
                                        {t.image ? <img src={t.image} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : t.initial}
                                    </div>
                                    <div className="testimonial-author-info"><h5>{t.name}</h5><span>{t.role}</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function CodeTypewriter() {
    const codeLines = [
        [
            { text: "const", Class: "keyword" }, { text: " " },
            { text: "project", Class: "var" }, { text: " = " },
            { text: "new", Class: "keyword" }, { text: " " },
            { text: "Project", Class: "class" }, { text: "();" }
        ],
        [
            { text: "project", Class: "var" }, { text: "." },
            { text: "collaborator", Class: "prop" }, { text: " = " },
            { text: "\"Syafiq Siregar\"", Class: "string" }, { text: ";" }
        ],
        [
            { text: "project", Class: "var" }, { text: "." },
            { text: "status", Class: "prop" }, { text: " = " },
            { text: "\"Success\"", Class: "string" }, { text: ";" }
        ],
        [], // Empty line
        [
            { text: "// Ready to launch?", Class: "comment" }
        ],
        [
            { text: "await", Class: "keyword" }, { text: " " },
            { text: "contactMe", Class: "func" }, { text: "();" }
        ]
    ];

    const [displayedContent, setDisplayedContent] = useState([[]]);
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let lineIdx = 0;
        let tokenIdx = 0;
        let charIdx = 0;
        let currentLines = [[]];

        const typeChar = () => {
            if (!isMounted) return;

            // If we've finished all lines, wait 5 seconds and reset
            if (lineIdx >= codeLines.length) {
                setTimeout(() => {
                    if (!isMounted) return;
                    lineIdx = 0;
                    tokenIdx = 0;
                    charIdx = 0;
                    currentLines = [[]];
                    setDisplayedContent([[]]);
                    typeChar();
                }, 5000);
                return;
            }

            const speed = 30 + Math.random() * 40;
            const currentLine = codeLines[lineIdx];

            if (tokenIdx >= currentLine.length) {
                lineIdx++;
                tokenIdx = 0;
                charIdx = 0;

                if (lineIdx < codeLines.length) {
                    currentLines.push([]);
                    setDisplayedContent([...currentLines]);
                    setTimeout(typeChar, 100);
                } else {
                    // Trigger the finish check on next tick
                    typeChar();
                }
                return;
            }

            const currentToken = currentLine[tokenIdx];
            const char = currentToken.text[charIdx];

            if (!currentLines[lineIdx]) currentLines[lineIdx] = [];
            const lineArr = currentLines[lineIdx];

            if (lineArr.length <= tokenIdx) {
                lineArr.push({ text: char, Class: currentToken.Class });
            } else {
                lineArr[tokenIdx].text += char;
            }

            setDisplayedContent([...currentLines]);

            charIdx++;
            if (charIdx >= currentToken.text.length) {
                tokenIdx++;
                charIdx = 0;
            }

            setTimeout(typeChar, speed);
        };

        const timer = setTimeout(typeChar, 500);
        const cursorInterval = setInterval(() => {
            if (isMounted) setCursorVisible(v => !v);
        }, 500);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            clearInterval(cursorInterval);
        };
    }, []);

    return (
        <div className="code-content">
            {displayedContent.map((line, i) => (
                <div key={i} className="code-line">
                    {line.length === 0 && <br />}
                    {line.map((token, j) => (
                        <span key={j} className={token.Class}>{token.text}</span>
                    ))}
                    {i === displayedContent.length - 1 && (
                        <span className="cursor" style={{ opacity: cursorVisible ? 1 : 0 }}>|</span>
                    )}
                </div>
            ))}
        </div>
    );
}


function SystemKernelSection() {
    const ref = useScrollReveal();
    const [stats, setStats] = useState({ cpu: 12, mem: 45, net: 20 });

    useEffect(() => {
        const interval = setInterval(() => {
            setStats({
                cpu: Math.floor(Math.random() * 30) + 10,
                mem: Math.floor(Math.random() * 20) + 40,
                net: Math.floor(Math.random() * 50) + 10
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const modules = [
        { name: 'REACT.JS', type: 'CORE_LOGIC', ver: 'v18.2.0', status: 'ACTIVE' },
        { name: 'THREE.JS', type: 'RENDER_ENGINE', ver: 'r160', status: 'RUNNING' },
        { name: 'WEBGL', type: 'GPU_ACCEL', ver: '2.0', status: 'READY' },
        { name: 'GLSL', type: 'SHADER_LANG', ver: 'ES 3.0', status: 'COMPILED' }
    ];

    return (
        <div className="system-kernel-section reveal" ref={ref}>
            <div className="sys-header">
                <div className="sys-title">
                    <span className="sys-icon">⚡</span> SYSTEM_KERNEL
                </div>
                <div className="sys-line"></div>
                <div className="sys-status">ONLINE</div>
            </div>

            <div className="sys-dashboard">
                <div className="sys-stats-row">
                    <div className="sys-stat-item">
                        <span className="label">CPU_LOAD</span>
                        <div className="bar-container">
                            <div className="bar-fill" style={{ width: `${stats.cpu}%` }}></div>
                        </div>
                        <span className="value">{stats.cpu}%</span>
                    </div>
                    <div className="sys-stat-item">
                        <span className="label">MEMORY</span>
                        <div className="bar-container">
                            <div className="bar-fill" style={{ width: `${stats.mem}%` }}></div>
                        </div>
                        <span className="value">{stats.mem}GB</span>
                    </div>
                    <div className="sys-stat-item">
                        <span className="label">NET_IO</span>
                        <div className="bar-container">
                            <div className="bar-fill" style={{ width: `${stats.net}%` }}></div>
                        </div>
                        <span className="value">{stats.net}MB/s</span>
                    </div>
                </div>

                <div className="sys-modules-grid">
                    {modules.map((m, i) => (
                        <div key={i} className="sys-module-card">
                            <div className="sys-module-header">
                                <span className="mod-name">{m.name}</span>
                                <span className="mod-ver">{m.ver}</span>
                            </div>
                            <div className="sys-module-body">
                                <div className="mod-row">
                                    <span>TYPE:</span> <span>{m.type}</span>
                                </div>
                                <div className="mod-row">
                                    <span>STATUS:</span> <span className="status-ok">{m.status}</span>
                                </div>
                            </div>
                            <div className="sys-corner-tl"></div>
                            <div className="sys-corner-br"></div>
                        </div>
                    ))}
                </div>

                <div className="sys-terminal">
                    <span className="term-prompt">&gt;</span> core_systems_check initiating... <span className="term-cursor">_</span>
                </div>
            </div>
        </div>
    );
}


function ExperimentLogsSection({ logs }) {
    const ref = useScrollReveal();
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentText, setCurrentText] = useState('');

    useEffect(() => {
        if (!logs || logs.length === 0) return;

        // ALL LINES FINISHED -> Wait 10s then restart
        if (currentLineIndex >= logs.length) {
            const timeout = setTimeout(() => {
                setCurrentLineIndex(0);
                setCurrentText('');
            }, 10000);
            return () => clearTimeout(timeout);
        }

        const activeLog = logs[currentLineIndex];
        const fullMessage = activeLog.msg;

        // TYPING CURRENT LINE
        if (currentText.length < fullMessage.length) {
            const timeout = setTimeout(() => {
                setCurrentText(prev => prev + fullMessage[currentText.length]);
            }, Math.random() * 30 + 30); // 30-60ms typing speed
            return () => clearTimeout(timeout);
        }

        // LINE FINISHED -> Wait small delay then move to next line
        else {
            const timeout = setTimeout(() => {
                setCurrentLineIndex(prev => prev + 1);
                setCurrentText('');
            }, 600); // 600ms pause between lines
            return () => clearTimeout(timeout);
        }
    }, [currentLineIndex, currentText, logs]);

    return (
        <div className="experiment-logs-section reveal" ref={ref}>
            <div className="logs-container">
                <div className="logs-header">
                    <span className="logs-title">&gt;_ ACCESSING PROJECT OUTCOMES..</span>
                </div>
                <div className="logs-body">
                    {logs.map((log, i) => {
                        // Only render lines that are currently being typed or already done
                        if (i > currentLineIndex) return null;

                        const isCurrentLine = i === currentLineIndex;
                        const displayMsg = isCurrentLine ? currentText : log.msg;

                        return (
                            <div key={i} className="log-entry">
                                <span className="log-timestamp">[{log.id}]</span>
                                <span className={`log-status status-${log.status.toLowerCase()}`}>[{log.status}]</span>
                                <span className="log-message">:: {displayMsg}</span>
                                {isCurrentLine && <span className="term-cursor">_</span>}
                                {(!isCurrentLine && i < currentLineIndex && log.metric) && (
                                    <div className="log-metric">&gt; {log.metric}</div>
                                )}
                            </div>
                        );
                    })}

                    {currentLineIndex >= logs.length && (
                        <div className="log-entry log-end">
                            <span className="log-message">// END_OF_LOG</span>
                            <span className="log-cursor">_</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function HoloCTASection({ onBack }) {
    const ref = useScrollReveal();

    return (
        <div className="holo-cta-section reveal" ref={ref}>
            <div className="holo-container">
                <div className="holo-grid-bg"></div>
                <div className="holo-content">
                    <div className="holo-icon">🤝</div>
                    <h3>COLLABORATION</h3>
                    <div className="holo-line"></div>
                    <p>Interested in joint research or experimental development?</p>

                    <div className="holo-actions">
                        <a href="mailto:syafiqsiregar17@gmail.com" className="holo-btn primary">
                            <span className="btn-glitch" data-text="[ CONTACT_ME ]">[ CONTACT_ME ]</span>
                            <span className="btn-arrow">&gt;&gt;&gt;</span>
                        </a>
                        <button onClick={onBack} className="holo-btn secondary">
                            <span className="btn-text">[ ACCESS_OTHER_LOGS ]</span>
                        </button>
                    </div>
                </div>
                <div className="holo-corner tl"></div>
                <div className="holo-corner tr"></div>
                <div className="holo-corner bl"></div>
                <div className="holo-corner br"></div>
            </div>
        </div>
    );
}



function LabDecorations() {
    return (
        <div className="lab-decorations-layer">
            <div className="lab-grid-bg"></div>
            <div className="lab-hud-layer">
                <div className="hud-corner tl">
                    <span>[+] SYSTEM_READY</span>
                    <span>V.2.0</span>
                </div>
                <div className="hud-corner tr">
                    <span>SECURE_CONNECTION</span>
                    <span className="hud-dot"></span>
                </div>
                <div className="hud-corner bl">
                    <span className="hud-rec">[ ● REC ]</span>
                </div>
                <div className="hud-corner br">
                    <span>COORD: X:45 Y:12</span>
                </div>

                <div className="hud-side-ruler left"></div>
                <div className="hud-side-ruler right"></div>
            </div>
            <div className="lab-floating-markers">
                <div className="marker m1">+</div>
                <div className="marker m2">+</div>
                <div className="marker m3"></div>
                <div className="marker m4"></div>
            </div>
        </div>
    );
}

function ScanlineOverlay() {
    return <div className="lab-scanline-overlay"></div>;
}

function CyberMeteorRain() {
    // Generate static array for meteors to avoid re-renders causing jumpiness
    const meteors = Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        side: i % 2 === 0 ? 'left' : 'right',
        delay: Math.random() * 5,
        duration: 2 + Math.random() * 3,
        left: i % 2 === 0 ? Math.random() * 100 : undefined,
        right: i % 2 !== 0 ? Math.random() * 100 : undefined,
    }));

    return (
        <div className="lab-meteor-rain-layer">
            <div className="meteor-container left">
                {meteors.filter(m => m.side === 'left').map(m => (
                    <div key={m.id} className="meteor" style={{
                        left: `${m.left}%`,
                        animationDelay: `${m.delay}s`,
                        animationDuration: `${m.duration}s`
                    }}></div>
                ))}
            </div>
            <div className="meteor-container right">
                {meteors.filter(m => m.side === 'right').map(m => (
                    <div key={m.id} className="meteor" style={{
                        right: `${m.right}%`,
                        animationDelay: `${m.delay}s`,
                        animationDuration: `${m.duration}s`
                    }}></div>
                ))}
            </div>
        </div>
    );
}



function CTASection() {
    const ref = useScrollReveal();
    return (
        <section className="cta-section" id="contact">
            <div className="container">
                <div className="cta-grid reveal" ref={ref}>
                    <div className="cta-left-col">
                        <div className="cta-header">
                            <h2>Let's build something <br /><span className="gradient-text">extraordinary</span> together</h2>
                            <p>I'm currently available for freelance projects and open to new opportunities. Let's turn your ideas into reality.</p>
                        </div>

                        <div className="coding-animation">
                            <div className="window-bar">
                                <span className="dot red"></span>
                                <span className="dot yellow"></span>
                                <span className="dot green"></span>
                            </div>
                            <CodeTypewriter />
                        </div>
                    </div>

                    <div className="cta-form-card tilt-card">
                        <div className="card-shine" />
                        <h3>Execute your vision</h3>
                        <p>Ready to define the future? Tell me about your project context and let's craft a solution.</p>
                        <form className="contact-form" onSubmit={(e) => {
                            e.preventDefault();
                            const name = e.target.name.value;
                            const email = e.target.user_email.value;
                            const message = e.target.message.value;
                            const waText = `Halo Syafiq! 👋\n\n*Nama:* ${name}\n*Email:* ${email}\n*Project Brief:*\n${message}`;
                            const waUrl = `https://wa.me/6287792490128?text=${encodeURIComponent(waText)}`;
                            window.open(waUrl, '_blank');
                        }}>
                            <div className="form-group floating-label">
                                <input type="text" name="name" id="name" placeholder=" " required />
                                <label htmlFor="name">Your Name</label>
                            </div>
                            <div className="form-group floating-label">
                                <input type="email" name="user_email" id="email" placeholder=" " required />
                                <label htmlFor="email">Email Address</label>
                            </div>
                            <div className="form-group floating-label">
                                <textarea name="message" id="message" placeholder=" " rows="4" required></textarea>
                                <label htmlFor="message">Project Brief</label>
                            </div>
                            <button type="submit" className="btn-primary full-width magic-hover">
                                <span className="btn-text">Initiate Collaboration</span>
                                <span className="btn-particles"></span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Footer() {
    const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-content">
                    <span className="logo" onClick={() => scrollTo('hero')}>Portofolio✦</span>
                    <ul className="footer-links">
                        <li><a onClick={() => scrollTo('features')}>Skills</a></li>
                        <li><a onClick={() => scrollTo('work')}>Work</a></li>
                        <li><a onClick={() => scrollTo('testimonials')}>Testimonials</a></li>
                        <li><a onClick={() => scrollTo('contact')}>Contact</a></li>
                    </ul>
                    <div className="footer-socials">
                        <a href="https://www.instagram.com/ssyafiqsiregar?igsh=MXUxaHJ5a29xc3dyZg%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                        </a>
                        <a href="https://github.com/SyafiqSiregar" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="GitHub">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
                        </a>
                        <a href="https://www.linkedin.com/in/syafiq-yusuf-ikhsan-william-siregar-7938ab330?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                        </a>
                        <a href="https://wa.me/6287792490128" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="WhatsApp">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                        </a>
                    </div>
                    <span className="footer-copy">© 2026 Syafiq Siregar. All rights reserved.</span>
                </div>
            </div>
        </footer>
    );
}

function ScrollToTop({ visible }) {
    return (
        <button className={`scroll-top${visible ? ' visible' : ''}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
    );
}

/* ===== App ===== */
function App() {
    const [view, setView] = useState('home'); // 'home' or 'project'
    const [activeProject, setActiveProject] = useState(null);

    const handleProjectClick = (project) => {
        setActiveProject(project);
        setView('project');
    };

    const handleBack = () => {
        setView('home');
        setActiveProject(null);
    };

    return (
        <>
            {view === 'home' ? (
                <Home onProjectClick={handleProjectClick} />
            ) : (
                <ProjectDetail project={activeProject} onBack={handleBack} />
            )}
        </>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
