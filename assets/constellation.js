// Constellation Network Animation
// Slow drifting nodes with dynamic connections
// Blue flash on new connections — adapted for AllTime

(function() {
    const canvas = document.getElementById('constellation-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Configuration
    const config = {
        nodeCount: window.innerWidth < 768 ? 50 : 90,
        connectionDistance: 150,
        scrollDepthMultiplier: 1.2,
        driftSpeed: 0.25
    };

    let nodes = [];
    let scrollY = 0;
    let targetScrollY = 0;
    let pageHeight = 0;
    let activeConnections = new Set();
    let flashingConnections = new Map();
    let currentDriftSpeed = 1;
    let targetDriftSpeed = 1;
    let resizeTimeout = null;
    let lastWidth = 0;
    let lastHeight = 0;
    let mouseX = -1000;
    let mouseY = -1000;
    let mouseActive = false;

    // Mouse repulsion config
    const mouseConfig = {
        clearRadius: 180,
        pushStrength: 0.25
    };

    // Flash color — AllTime brand blue
    const flashColor = { r: 0, g: 122, b: 255 };

    // Resize canvas (no node regeneration)
    function resizeCanvas() {
        const oldWidth = canvas.width || window.innerWidth;
        const oldPageHeight = pageHeight || document.documentElement.scrollHeight;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        pageHeight = document.documentElement.scrollHeight;

        if (nodes.length > 0 && oldWidth > 0 && oldPageHeight > 0) {
            const scaleX = canvas.width / oldWidth;
            const scaleY = pageHeight / oldPageHeight;

            nodes.forEach(node => {
                node.baseX *= scaleX;
                node.baseY *= scaleY;
            });
        }
    }

    // Debounced resize handler
    function handleResize() {
        resizeCanvas();

        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const isMobile = window.innerWidth < 768;
            const wasMobile = lastWidth < 768;

            if (isMobile !== wasMobile && lastWidth > 0) {
                initNodes();
            }

            lastWidth = window.innerWidth;
            lastHeight = window.innerHeight;
        }, 250);
    }

    // Initialize nodes spread across entire page height
    function initNodes() {
        nodes = [];
        const count = window.innerWidth < 768 ? 50 : 90;

        for (let i = 0; i < count; i++) {
            const depth = Math.random();
            const speedMultiplier = 0.5 + depth * 1.5;

            nodes.push({
                baseX: Math.random() * canvas.width,
                baseY: Math.random() * pageHeight,
                vx: (Math.random() - 0.5) * config.driftSpeed * speedMultiplier,
                vy: (Math.random() - 0.5) * config.driftSpeed * speedMultiplier,
                z: depth,
                size: 2 + depth * depth * (20 + Math.random() * 35),
                opacity: 0.08 + depth * 0.42
            });
        }

        nodes.sort((a, b) => a.z - b.z);
    }

    // Update node positions (drift + mouse repulsion)
    function updateNodes() {
        targetDriftSpeed = 1;
        currentDriftSpeed += (targetDriftSpeed - currentDriftSpeed) * 0.05;

        nodes.forEach(node => {
            // Normal drifting
            node.baseX += node.vx * currentDriftSpeed;
            node.baseY += node.vy * currentDriftSpeed;

            // Mouse repulsion
            if (mouseActive) {
                const parallaxStrength = 1 - (node.z * config.scrollDepthMultiplier);
                const nodeScreenY = node.baseY - scrollY * parallaxStrength;

                const dx = node.baseX - mouseX;
                const dy = nodeScreenY - mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouseConfig.clearRadius && distance > 0) {
                    const pushFactor = (mouseConfig.clearRadius - distance) / mouseConfig.clearRadius;
                    const depthScale = 0.5 + node.z * 0.5;
                    const push = pushFactor * mouseConfig.pushStrength * depthScale;

                    node.baseX += (dx / distance) * push * 10;
                    node.baseY += (dy / distance) * push * 10;
                }
            }

            // Wrap around edges
            if (node.baseX < -50) node.baseX = canvas.width + 50;
            if (node.baseX > canvas.width + 50) node.baseX = -50;
            if (node.baseY < -50) node.baseY = pageHeight + 50;
            if (node.baseY > pageHeight + 50) node.baseY = -50;
        });
    }

    // Get scroll-adjusted position for parallax
    function getNodePosition(node) {
        const parallaxStrength = 1 - (node.z * config.scrollDepthMultiplier);
        const yOffset = scrollY * parallaxStrength;

        return {
            x: node.baseX,
            y: node.baseY - yOffset
        };
    }

    // Generate connection key
    function getConnectionKey(i, j) {
        return i < j ? `${i}-${j}` : `${j}-${i}`;
    }

    // Draw connections between nearby nodes
    function drawConnections() {
        const newConnections = new Set();

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];

                const posA = getNodePosition(nodeA);
                const posB = getNodePosition(nodeB);

                const distance = Math.sqrt(
                    (posB.x - posA.x) ** 2 + (posB.y - posA.y) ** 2
                );

                if (distance < config.connectionDistance) {
                    const connectionKey = getConnectionKey(i, j);
                    newConnections.add(connectionKey);

                    // Flash on new connection
                    if (!activeConnections.has(connectionKey)) {
                        flashingConnections.set(connectionKey, { intensity: 0.4, color: flashColor });
                    }

                    // Line opacity based on distance and average depth
                    const avgDepth = (nodeA.z + nodeB.z) / 2;
                    const distanceFade = 1 - distance / config.connectionDistance;
                    const opacity = distanceFade * avgDepth * 0.3;

                    const flash = flashingConnections.get(connectionKey);
                    const flashIntensity = flash ? flash.intensity : 0;
                    const currentFlashColor = flash ? flash.color : null;

                    // Draw connection line — dark on light background
                    ctx.beginPath();
                    ctx.moveTo(posA.x, posA.y);
                    ctx.lineTo(posB.x, posB.y);
                    ctx.strokeStyle = `rgba(50, 50, 50, ${opacity})`;
                    ctx.lineWidth = 0.5 + avgDepth * 0.5;
                    ctx.stroke();

                    // Draw flash glow at both nodes
                    if (flashIntensity > 0.01 && currentFlashColor) {
                        const { r, g, b } = currentFlashColor;

                        // Glow at node A
                        const glowRadiusA = nodeA.size * 2;
                        const flashGlowA = ctx.createRadialGradient(
                            posA.x, posA.y, 0,
                            posA.x, posA.y, glowRadiusA
                        );
                        flashGlowA.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${flashIntensity * 0.5})`);
                        flashGlowA.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${flashIntensity * 0.2})`);
                        flashGlowA.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                        ctx.beginPath();
                        ctx.arc(posA.x, posA.y, glowRadiusA, 0, Math.PI * 2);
                        ctx.fillStyle = flashGlowA;
                        ctx.fill();

                        // Glow at node B
                        const glowRadiusB = nodeB.size * 2;
                        const flashGlowB = ctx.createRadialGradient(
                            posB.x, posB.y, 0,
                            posB.x, posB.y, glowRadiusB
                        );
                        flashGlowB.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${flashIntensity * 0.5})`);
                        flashGlowB.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${flashIntensity * 0.2})`);
                        flashGlowB.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                        ctx.beginPath();
                        ctx.arc(posB.x, posB.y, glowRadiusB, 0, Math.PI * 2);
                        ctx.fillStyle = flashGlowB;
                        ctx.fill();
                    }
                }
            }
        }

        // Update active connections
        activeConnections = newConnections;

        // Decay flash intensity
        flashingConnections.forEach((flash, key) => {
            const newIntensity = flash.intensity * 0.96;
            if (newIntensity < 0.01) {
                flashingConnections.delete(key);
            } else {
                flashingConnections.set(key, { ...flash, intensity: newIntensity });
            }
        });
    }

    // Draw nodes — light gray/silver for white background
    function drawNodes() {
        nodes.forEach(node => {
            const pos = getNodePosition(node);

            // Skip if off screen
            const margin = node.size * 4;
            if (pos.y < -margin || pos.y > canvas.height + margin) return;
            if (pos.x < -margin || pos.x > canvas.width + margin) return;

            const displaySize = node.size;

            // Subtle brand-colored glow (proportional to node size)
            const glowSize = displaySize * 2.5;
            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, glowSize
            );
            // Soft blue glow matching AllTime brand
            gradient.addColorStop(0, `rgba(0, 122, 255, 0.12)`);
            gradient.addColorStop(0.4, `rgba(0, 122, 255, 0.04)`);
            gradient.addColorStop(1, `rgba(0, 122, 255, 0)`);

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Core dot — light gray/silver
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, displaySize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 200, 200, ${0.4 + node.z * 0.4})`;
            ctx.fill();
        });
    }

    // Render frame
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawConnections();
        drawNodes();
    }

    // Animation loop
    function animate() {
        updateScroll();
        updateNodes();
        render();
        requestAnimationFrame(animate);
    }

    // Handle scroll
    function handleScroll() {
        targetScrollY = Math.max(0, window.scrollY);
    }

    // Smooth scroll interpolation
    function updateScroll() {
        scrollY += (targetScrollY - scrollY) * 0.15;
    }

    // Initialize
    function init() {
        targetScrollY = Math.max(0, window.scrollY);
        scrollY = targetScrollY;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        pageHeight = document.documentElement.scrollHeight;
        lastWidth = window.innerWidth;
        lastHeight = window.innerHeight;

        initNodes();

        // Recalculate page height after layout settles
        setTimeout(() => {
            pageHeight = document.documentElement.scrollHeight;
        }, 100);

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Mouse tracking for repulsion
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            mouseActive = true;
        });

        document.addEventListener('mouseleave', () => {
            mouseActive = false;
        });

        animate();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
