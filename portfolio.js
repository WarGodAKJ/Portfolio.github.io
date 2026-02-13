document.addEventListener('DOMContentLoaded', () => {
    /* =========================================
       1. TYPEWRITER EFFECT
       ========================================= */
    const roles = [
        "MECHANICAL_ENGINEER",
        "ROBOTICS_ENTHUSIAST",
        "PRODUCT_DESIGNER",
        "SYSTEMS_INTEGRATOR"
    ];
    
    const typewriterEl = document.getElementById('typewriter');
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeEffect() {
        if (!typewriterEl) return;
        const currentRole = roles[roleIndex];
        
        if (isDeleting) {
            typewriterEl.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typewriterEl.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
        }

        let typingSpeed = isDeleting ? 40 : 100;

        if (!isDeleting && charIndex === currentRole.length) {
            typingSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            typingSpeed = 500;
        }

        setTimeout(typeEffect, typingSpeed);
    }
    
    setTimeout(typeEffect, 1000);

    /* =========================================
       2. HUD (HEADS-UP DISPLAY) LOGIC
       ========================================= */
    const cursorXEl = document.getElementById('cursor-x');
    const cursorYEl = document.getElementById('cursor-y');
    const hudTimeEl = document.getElementById('hud-time');

    function updateClock() {
        if(!hudTimeEl) return;
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        hudTimeEl.textContent = `${hrs}:${mins}:${secs}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Mouse Tracking & Idle Detection
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let lastMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let idleTimer = Date.now();
    let isIdle = false;
    let isMouseDown = false;
    
    // Industrial Idle State Machine Variables
    let idleState = 'MOVING';
    let idleTarget = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let idleWaitTimer = 0;

    // --- FULLSCREEN TOGGLE ---
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    // Only run Arm logic on PC (width > 1024px)
    if (window.innerWidth > 1024) {
        
        const canvas = document.getElementById('robotic-arm-bg');
        const ctx = canvas.getContext('2d');
        
        let width, height;
        let armBase = { x: 0, y: 0 };
        
        const numSegments = 4;
        const segmentLengths = [130, 110, 90, 70];
        let segments = [];
        let sparks = [];
        
        const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        function initCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            armBase.x = width / 2;
            armBase.y = height; 
            
            segments = [];
            for(let i = 0; i < numSegments; i++) {
                segments.push({
                    x: armBase.x,
                    y: armBase.y - (i * 50),
                    angle: 0,
                    length: segmentLengths[i]
                });
            }
            pickNewIdleTarget();
        }

        // --- Natural Pose Generator ---
        function pickNewIdleTarget() {
            const totalLength = segmentLengths.reduce((a, b) => a + b, 0);
            const minReach = totalLength * 0.3;
            const maxReach = totalLength * 0.85; 
            const reach = minReach + Math.random() * (maxReach - minReach);
            const angle = -0.2 - Math.random() * (Math.PI - 0.4);
            
            idleTarget.x = armBase.x + Math.cos(angle) * reach;
            idleTarget.y = armBase.y + Math.sin(angle) * reach;
        }

        function reach(segment, tx, ty) {
            const dx = tx - segment.x;
            const dy = ty - segment.y;
            segment.angle = Math.atan2(dy, dx);
            segment.x = tx - Math.cos(segment.angle) * segment.length;
            segment.y = ty - Math.sin(segment.angle) * segment.length;
        }

        function position(segmentA, segmentB) {
            segmentB.x = segmentA.x + Math.cos(segmentA.angle) * segmentA.length;
            segmentB.y = segmentA.y + Math.sin(segmentA.angle) * segmentA.length;
        }

        function animateArm() {
            ctx.clearRect(0, 0, width, height);

            // --- IK SOLVER FIRST ---
            reach(segments[numSegments - 1], target.x, target.y);
            for(let i = numSegments - 2; i >= 0; i--) {
                reach(segments[i], segments[i+1].x, segments[i+1].y);
            }
            segments[0].x = armBase.x;
            segments[0].y = armBase.y;
            for(let i = 0; i < numSegments - 1; i++) {
                position(segments[i], segments[i+1]);
            }

            // Calculate EXACT Tip Position
            const lastSeg = segments[numSegments - 1];
            const actualTipX = lastSeg.x + Math.cos(lastSeg.angle) * lastSeg.length;
            const actualTipY = lastSeg.y + Math.sin(lastSeg.angle) * lastSeg.length;
            
            // --- STATE LOGIC ---
            // Enter idle if no movement for 2.5s AND mouse is not held down
            if (!isMouseDown && Date.now() - idleTimer > 2500) {
                isIdle = true;
            }

            // 1. IDLE MODE
            if (isIdle) {
                if (idleState === 'MOVING') {
                    target.x += (idleTarget.x - target.x) * 0.012;
                    target.y += (idleTarget.y - target.y) * 0.012;

                    if (Math.hypot(idleTarget.x - target.x, idleTarget.y - target.y) < 5) {
                        idleState = 'WELDING';
                        idleWaitTimer = Date.now();
                    }
                } else if (idleState === 'WELDING') {
                    target.x += (idleTarget.x - target.x) * 0.1;
                    target.y += (idleTarget.y - target.y) * 0.1;

                    if (Date.now() - idleWaitTimer > 1200 + Math.random() * 1500) {
                        idleState = 'MOVING';
                        pickNewIdleTarget();
                    }
                }
            } 
            // 2. ACTIVE MOUSE CONTROL
            else {
                target.x += (mouse.x - target.x) * 0.08;
                target.y += (mouse.y - target.y) * 0.08;
            }

            // --- DRAW ARM ---
            ctx.fillStyle = '#111';
            ctx.fillRect(armBase.x - 30, armBase.y - 15, 60, 30);
            ctx.beginPath();
            ctx.arc(armBase.x, armBase.y - 15, 20, 0, Math.PI * 2);
            ctx.fillStyle = '#2c3e50'; 
            ctx.fill();

            for(let i = 0; i < numSegments; i++) {
                const seg = segments[i];
                const nextX = seg.x + Math.cos(seg.angle) * seg.length;
                const nextY = seg.y + Math.sin(seg.angle) * seg.length;

                const baseThick = (numSegments - i) * 2 + 6;
                const endThick = (numSegments - i - 1) * 2 + 6;

                const p1x = Math.cos(seg.angle - Math.PI/2);
                const p1y = Math.sin(seg.angle - Math.PI/2);
                const p2x = Math.cos(seg.angle + Math.PI/2);
                const p2y = Math.sin(seg.angle + Math.PI/2);

                ctx.beginPath();
                ctx.moveTo(seg.x + p1x * baseThick, seg.y + p1y * baseThick);
                ctx.lineTo(nextX + p1x * endThick, nextY + p1y * endThick);
                ctx.lineTo(nextX + p2x * endThick, nextY + p2y * endThick);
                ctx.lineTo(seg.x + p2x * baseThick, seg.y + p2y * baseThick);
                ctx.closePath();
                
                ctx.fillStyle = 'rgba(150, 160, 170, 0.9)'; 
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(seg.x, seg.y, baseThick + 2, 0, Math.PI * 2);
                ctx.fillStyle = '#1a1f24';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#00f3ff'; 
                ctx.stroke();

                if (i === numSegments - 1) {
                    ctx.save();
                    ctx.translate(nextX, nextY);
                    ctx.rotate(seg.angle);
                    
                    ctx.fillStyle = '#2c3e50';
                    ctx.fillRect(0, -8, 12, 16);
                    
                    ctx.beginPath();
                    ctx.moveTo(12, -4);
                    ctx.lineTo(24, -1);
                    ctx.lineTo(24, 1);
                    ctx.lineTo(12, 4);
                    ctx.fillStyle = '#e0e6ed';
                    ctx.fill();
                    ctx.restore();

                    // Determine if we should spark/glow
                    const isWorking = (isIdle && idleState === 'WELDING') || isMouseDown;

                    if (isWorking) {
                        // Arc Glow
                        ctx.beginPath();
                        ctx.arc(nextX, nextY, 6 + Math.random()*6, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.shadowBlur = 20;
                        ctx.shadowColor = '#00f3ff';
                        ctx.fill();
                        ctx.shadowBlur = 0;

                        // Emit Sparks
                        if (Math.random() > 0.4) { 
                            for (let i = 0; i < 2; i++) {
                                const angle = Math.PI/2 + (Math.random() - 0.5) * 2.0; 
                                const speed = 2 + Math.random() * 6;
                                sparks.push({
                                    x: actualTipX, 
                                    y: actualTipY,
                                    vx: Math.cos(angle) * speed,
                                    vy: Math.sin(angle) * speed,
                                    life: 1.0,
                                    maxLife: 0.5 + Math.random() * 0.8
                                });
                            }
                        }
                    }
                    
                    // Crosshairs (only show when dragging mouse, hide during idle)
                    if (!isIdle) {
                        ctx.beginPath();
                        ctx.moveTo(target.x - 10, target.y);
                        ctx.lineTo(target.x + 10, target.y);
                        ctx.moveTo(target.x, target.y - 10);
                        ctx.lineTo(target.x, target.y + 10);
                        ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                }
            }

            // --- DRAW SPARKS ---
            for (let i = sparks.length - 1; i >= 0; i--) {
                let s = sparks[i];
                let px = s.x;
                let py = s.y;

                s.x += s.vx;
                s.y += s.vy;
                s.vy += 0.3; 
                s.vx *= 0.94; 
                s.vy *= 0.96; 
                s.life -= 0.02;

                let color = '';
                let ratio = s.life / s.maxLife;
                if (ratio > 0.7) color = `rgba(255, 255, 255, ${ratio})`;
                else if (ratio > 0.3) color = `rgba(0, 243, 255, ${ratio})`;
                else color = `rgba(0, 100, 255, ${ratio})`;

                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(s.x, s.y);
                ctx.strokeStyle = color;
                ctx.lineWidth = Math.max(0.5, ratio * 2.5); 
                ctx.lineCap = 'round';
                ctx.stroke();

                if (s.y > armBase.y) {
                    s.y = armBase.y;
                    s.vy *= -0.3;
                    s.vx *= 0.7;
                }

                if(s.life <= 0) sparks.splice(i, 1);
            }

            requestAnimationFrame(animateArm);
        }

        // Initialize and listen for events
        initCanvas();
        animateArm();
        
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(initCanvas, 200);
        });

        window.addEventListener('mousemove', (e) => {
            const dist = Math.hypot(e.clientX - lastMouse.x, e.clientY - lastMouse.y);
            
            if (dist > 5) { 
                idleTimer = Date.now();
                isIdle = false;
                if (idleState === 'WELDING') {
                    idleState = 'MOVING';
                    pickNewIdleTarget();
                }
            }
            
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            lastMouse.x = e.clientX;
            lastMouse.y = e.clientY;
            
            if(cursorXEl && cursorYEl) {
                cursorXEl.textContent = String(e.clientX).padStart(4, '0');
                cursorYEl.textContent = String(e.clientY).padStart(4, '0');
            }
        });

        window.addEventListener('mousedown', () => {
            isMouseDown = true;
            isIdle = false; 
            idleTimer = Date.now(); 
            if (idleState === 'WELDING') {
                idleState = 'MOVING';
                pickNewIdleTarget();
            }
        });

        window.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
    }

    /* =========================================
       5. UI INTERACTIONS & MODALS
       ========================================= */
    
    const projectsInfo = {
        proj1: {
            title: "Tone Control/Karaoke Mixer Circuit",
            desc: "A five-stage audio processing system, featuring mixer/karaoke switching, tone control, and LED display. Designed and simulated using Multisim and MATLAB.",
            achievement: "Achievement: Clear audio with effective tone control.",
            img: "assets/project1-img.jpg",
            link: { type: "pdf", url: "assets/project1-report.pdf", label: "VIEW SCHEMATICS [PDF]" }
        },
        proj2: {
            title: "Multi-Sensor Haptic Headset – ASME",
            desc: "A multi-sensor vibration feedback wearable for visually impaired navigation. Features real-time proximity detection using Arduino and ultrasonic sensors.",
            achievement: "Achievement: Tactile feedback device improving user experience.",
            img: "assets/project2-img.jpg",
            link: { type: "github", url: "https://github.com/UnbrokenMango21/AssistiveTechHeadset", label: "SOURCE_CODE [GITHUB]" }
        },
        proj3: {
            title: "Kibble Dispenser for Service Dogs",
            desc: "A wheelchair-attachable dog food dispenser delivering single kibbles, optimized for low-dexterity users. Designed in Fusion 360, prototyped via 3D printing.",
            achievement: "Achievement: 90% success rate operated by target users.",
            img: "assets/project3-img.jpg",
            link: { type: "pdf", url: "assets/project3-proposal.pdf", label: "DESIGN_SPECS [PDF]" }
        },
        proj4: {
            title: "Additive Manufacturing Research",
            desc: "Finite element analysis and mesh convergence studies on brass-steel alloys for additive manufacturing. Improved simulation speeds, lower error, and higher reliability.",
            achievement: "Achievement: Reduced mesh element count by 40% while improving reliability by 30%.",
            img: "assets/research_img_1.jpeg",
            link: null
        },
        proj5: {
            title: "SpotMicro Robot",
            desc: "Personal project to build and program a SpotMicro quadruped robot, focusing on electronics integration, kinematics, and control code.",
            achievement: "Status: Active Development",
            img: "assets/project5-img.jpg",
            img2: "assets/project5_2-img.jpeg",
            link: null
        },
        intern1: {
            title: "Screw Torque Testing",
            desc: "Tested screws under different torque levels and lengths for failure behavior for Cisco micro-LinkOVER products. Analyzed results and presented findings.",
            achievement: "Key Takeaway: Hands-on failure testing and mechanical data interpretation.",
            img: "assets/Screw PIC 1.png",
            img2: "assets/Screw PIC 2.png",
            link: null
        },
        intern2: {
            title: "PowerApp Interface for Failure Submissions",
            desc: "Built a user-friendly PowerApp linked to SharePoint for failure tracking. Enabled direct customer input for failed product details.",
            achievement: "Key Takeaway: Improved engineering workflows and customer-facing data pipelines.",
            img: "assets/Power PIC 1.png",
            img2: "assets/Power PIC 2.png",
            link: null
        },
        intern3: {
            title: "Qualification Reports & LLCR Data",
            desc: "Transferred LLCR data from Excel to Minitab for statistical analysis (probability plots). Authored Qualification Test Reports in Overleaf (LaTeX).",
            achievement: "Key Takeaway: Rigorous statistical processing and ISO standard compliance.",
            img: "assets/Qualification PIC 1.png",
            link: null
        },
        intern4: {
            title: "Fixture Design for Vibration Testing",
            desc: "Designed fixtures for complex PCB vibration testing setups. Reviewed 2D PCB traces to ensure proper mounting and mechanical integrity.",
            achievement: "Key Takeaway: Applied DFAM techniques to real-world industrial fixtures.",
            img: "assets/Fixture PIC 2.png",
            link: null
        }
    };

    const modalBg = document.getElementById('modal-bg');
    let modalEl = null;
    let closeTimeout = null;

    function openModal(projectKey) {
        const project = projectsInfo[projectKey];
        if (!project) return;

        document.querySelectorAll('.project-modal').forEach(el => el.remove());
        clearTimeout(closeTimeout);
        modalEl = null;

        modalBg.classList.add('open');
        document.body.style.overflow = "hidden"; 
        
        window.history.pushState(null, null, `#${projectKey}`);

        modalEl = document.createElement("div");
        modalEl.className = "project-modal";

        let imageBlock = `<img src="${project.img}" alt="${project.title}">`;
        if (project.img2) {
            imageBlock += `<img src="${project.img2}" alt="${project.title} additional view">`;
        }

        modalEl.innerHTML = `
            <button class="modal-close" title="Close"><i class="fa-solid fa-xmark"></i></button>
            <h3><span class="bracket">[</span> ${project.title} <span class="bracket">]</span></h3>
            <div class="modal-left">
                ${project.desc ? `<div class="modal-content"><p>> ${project.desc}</p></div>` : ""}
                ${project.achievement ? `<div class="achievement"><i class="fa-solid fa-check"></i> ${project.achievement}</div>` : ""}
                ${project.link ? `<a href="${project.link.url}" target="_blank" class="action-btn primary" style="display:inline-block; margin-top: 1rem; text-align:center;">${project.link.label}</a>` : ""}
            </div>
            <div class="modal-right">
                ${imageBlock}
            </div>
        `;

        modalBg.appendChild(modalEl);
        modalEl.querySelector('.modal-close').onclick = closeModal;
    }

    function closeModal() {
        modalBg.classList.remove('open');
        document.body.style.overflow = "";
        window.history.pushState(null, null, ' '); 
        
        closeTimeout = setTimeout(() => {
            document.querySelectorAll('.project-modal').forEach(el => el.remove());
            modalEl = null;
        }, 400); 
    }

    modalBg.onclick = (e) => { if (e.target === modalBg) closeModal(); };

    document.querySelectorAll('.project-card').forEach(card => {
        card.onclick = () => openModal(card.getAttribute('data-project'));
    });

    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        if (projectsInfo[hash]) openModal(hash);
    }

    document.querySelectorAll('.exp-header').forEach(header => {
        header.onclick = function() {
            const parent = header.parentElement;
            parent.classList.toggle('open');
        }
    });

    /* =========================================
       6. MOBILE NAVIGATION & UTILS
       ========================================= */
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');

    function toggleNav() {
        const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', !isOpen);
        mobileNav.classList.toggle('open');
    }

    if (hamburger) hamburger.addEventListener('click', toggleNav);

    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            if (mobileNav.classList.contains('open')) toggleNav();
        });
    });

    const fadeElems = document.querySelectorAll('.fade-in-element');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    fadeElems.forEach(elem => observer.observe(elem));
});