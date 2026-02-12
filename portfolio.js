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
            typingSpeed = 2000; // Pause at end of word
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            typingSpeed = 500; // Pause before typing new word
        }

        setTimeout(typeEffect, typingSpeed);
    }
    
    // Start typing
    setTimeout(typeEffect, 1000);

    /* =========================================
       2. HUD (HEADS-UP DISPLAY) LOGIC
       ========================================= */
    const cursorXEl = document.getElementById('cursor-x');
    const cursorYEl = document.getElementById('cursor-y');
    const hudTimeEl = document.getElementById('hud-time');

    // Update Clock
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

    // Mouse Tracking for HUD & Robotic Arm
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        
        if(cursorXEl && cursorYEl) {
            cursorXEl.textContent = String(e.clientX).padStart(4, '0');
            cursorYEl.textContent = String(e.clientY).padStart(4, '0');
        }
    });

    /* =========================================
       3. INVERSE KINEMATICS ROBOTIC ARM
       ========================================= */
    const canvas = document.getElementById('robotic-arm-bg');
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let armBase = { x: 0, y: 0 };
    
    // Arm Configuration
    const numSegments = 4;
    const segmentLength = window.innerWidth > 768 ? 150 : 80;
    let segments = [];
    
    // Target with easing so the robot trails behind the mouse slightly
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    function initCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        armBase.x = width / 2;
        armBase.y = height; // Base is at the bottom center
        
        // Initialize segments
        segments = [];
        for(let i = 0; i < numSegments; i++) {
            segments.push({
                x: armBase.x,
                y: armBase.y - (i * segmentLength),
                angle: 0,
                length: segmentLength - (i * 15) // Segments get slightly shorter
            });
        }
    }

    // FABRIK Algorithm (Forward And Backward Reaching Inverse Kinematics)
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
        
        // Ease target to mouse (mechanical delay)
        target.x += (mouse.x - target.x) * 0.1;
        target.y += (mouse.y - target.y) * 0.1;

        // IK Logic
        // 1. Backward Reaching (from end effector to base)
        reach(segments[numSegments - 1], target.x, target.y);
        for(let i = numSegments - 2; i >= 0; i--) {
            reach(segments[i], segments[i+1].x, segments[i+1].y);
        }

        // 2. Forward Reaching (anchor base and position outwards)
        segments[0].x = armBase.x;
        segments[0].y = armBase.y;
        for(let i = 0; i < numSegments - 1; i++) {
            position(segments[i], segments[i+1]);
        }

        // Draw Arm
        for(let i = 0; i < numSegments; i++) {
            const seg = segments[i];
            const nextX = seg.x + Math.cos(seg.angle) * seg.length;
            const nextY = seg.y + Math.sin(seg.angle) * seg.length;

            // Draw link
            ctx.beginPath();
            ctx.moveTo(seg.x, seg.y);
            ctx.lineTo(nextX, nextY);
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
            ctx.lineWidth = (numSegments - i) * 8 + 4; // Thicker at base
            ctx.lineCap = 'round';
            ctx.stroke();

            // Draw joint
            ctx.beginPath();
            ctx.arc(seg.x, seg.y, (numSegments - i) * 3 + 5, 0, Math.PI * 2);
            ctx.fillStyle = '#060913';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00f3ff';
            ctx.stroke();
            
            // Draw end effector (Claw)
            if (i === numSegments - 1) {
                ctx.beginPath();
                ctx.arc(nextX, nextY, 8, 0, Math.PI * 2);
                ctx.fillStyle = '#00f3ff';
                ctx.fill();
                
                // Crosshairs at target
                ctx.beginPath();
                ctx.moveTo(target.x - 15, target.y);
                ctx.lineTo(target.x + 15, target.y);
                ctx.moveTo(target.x, target.y - 15);
                ctx.lineTo(target.x, target.y + 15);
                ctx.strokeStyle = 'rgba(255, 51, 102, 0.5)'; // Red accent
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        requestAnimationFrame(animateArm);
    }

    initCanvas();
    animateArm();
    
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initCanvas, 200);
    });

    /* =========================================
       4. MOBILE GYROSCOPE (Controls Arm Target)
       ========================================= */
    const gyroButton = document.getElementById('gyro-button');
    let isGyroEnabled = false;

    function handleOrientation(event) {
        // Map tilt to screen coordinates
        let x = event.gamma; // In degree in the range [-90,90]
        let y = event.beta;  // In degree in the range [-180,180]

        // Constrain and map to screen
        x += 90; // [0, 180]
        y += 90; // [0, 180]

        mouse.x = (width * x) / 180;
        mouse.y = (height * y) / 180;
    }

    if (gyroButton) {
        gyroButton.addEventListener('click', () => {
            if (isGyroEnabled) {
                window.removeEventListener('deviceorientation', handleOrientation);
                isGyroEnabled = false;
                gyroButton.textContent = 'ENABLE_GYRO';
                gyroButton.classList.remove('primary');
            } else {
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(permissionState => {
                            if (permissionState === 'granted') {
                                window.addEventListener('deviceorientation', handleOrientation);
                                isGyroEnabled = true;
                                gyroButton.textContent = 'DISABLE_GYRO';
                                gyroButton.classList.add('primary');
                            }
                        })
                        .catch(console.error);
                } else {
                    window.addEventListener('deviceorientation', handleOrientation);
                    isGyroEnabled = true;
                    gyroButton.textContent = 'DISABLE_GYRO';
                    gyroButton.classList.add('primary');
                }
            }
        });
    }

    /* =========================================
       5. UI INTERACTIONS & MODALS
       ========================================= */
    
    // Project Data
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

    function openModal(projectKey) {
        const project = projectsInfo[projectKey];
        if (!project) return;

        if (modalEl) modalEl.remove();

        modalBg.classList.add('open');
        document.body.style.overflow = "hidden"; // Prevent background scrolling
        
        // Deep linking hash
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
        if (modalEl) {
            modalBg.classList.remove('open');
            document.body.style.overflow = "";
            window.history.pushState(null, null, ' '); // Clear hash
            setTimeout(() => {
                if (modalEl) {
                    modalEl.remove();
                    modalEl = null;
                }
            }, 400); 
        }
    }

    modalBg.onclick = (e) => { if (e.target === modalBg) closeModal(); };

    // Attach click listeners to all project cards
    document.querySelectorAll('.project-card').forEach(card => {
        card.onclick = () => openModal(card.getAttribute('data-project'));
    });

    // Check URL hash for direct modal linking on load
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        if (projectsInfo[hash]) {
            openModal(hash);
        }
    }

    // Experience Dropdowns
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

    // Close mobile nav when clicking a link
    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', () => {
            if (mobileNav.classList.contains('open')) toggleNav();
        });
    });

    // Scroll Animations (Intersection Observer)
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
    
    // Page Visibility check to pause animations and save battery
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            // Cancel animation is tricky without an ID, but setting a flag works too.
            // For now, the browser's native requestAnimationFrame throttling handles this well.
        }
    });
});