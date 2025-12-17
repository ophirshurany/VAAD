(function() {
    console.log('Hanukkah module loaded');

    // 1. Inject CSS
    const css = `
        .menorah-candle {
            width: 10px;
            height: 24px;
            background: linear-gradient(to right, #e2e8f0, #94a3b8, #e2e8f0);
            border-radius: 3px;
            position: relative;
            box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.3);
        }
        @media (min-width: 1024px) {
            .menorah-candle {
                width: 14px;
                height: 34px;
                border-radius: 4px;
            }
        }
        .menorah-flame {
            position: absolute;
            top: -14px;
            left: 50%;
            transform: translateX(-50%) scale(0);
            width: 10px;
            height: 14px;
            background: radial-gradient(circle at 50% 80%, #fbbf24, #f59e0b, transparent 70%);
            border-radius: 50% 50% 20% 20%;
            filter: drop-shadow(0 0 4px #fbbf24);
            opacity: 0;
            transition: all 0.5s ease-out;
        }
        @media (min-width: 1024px) {
            .menorah-flame {
                top: -18px;
                width: 12px;
                height: 18px;
            }
        }
        .menorah-candle.lit .menorah-flame {
            opacity: 1;
            transform: translateX(-50%) scale(1);
            animation: menorah-flicker 1.5s infinite alternate;
        }
        @keyframes menorah-flicker {
            0% { opacity: 0.8; transform: translateX(-50%) scale(0.95); }
            100% { opacity: 1; transform: translateX(-50%) scale(1.05); }
        }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // 2. Inject HTML
    const slot = document.getElementById('event-slot');
    if (slot) {
        slot.innerHTML = `
            <div id="hanukkah-badge"
                class="flex items-center gap-2 lg:gap-3 bg-indigo-900/60 px-4 py-3 rounded-2xl border border-gold/30 shadow-lg scale-90 lg:scale-100 origin-left"
                title="חנוכה 2025">
                <span class="text-gold font-black text-xl lg:text-3xl">חנוכה</span>
                <div id="hanukkah-container" class="flex items-end gap-1 lg:gap-2">
                    <!-- Candles injected by JS -->
                </div>
            </div>
        `;
    }

    // 3. Logic
    function updateHanukkahCandles() {
        const container = document.getElementById('hanukkah-container');
        if (!container) return;

        // Define Schedule: [Date Object for lighting time]
        const year = 2025;
        const candlesSchedule = [
            new Date(`${year}-12-14T18:00:00`),
            new Date(`${year}-12-15T18:00:00`),
            new Date(`${year}-12-16T18:00:00`),
            new Date(`${year}-12-17T18:00:00`),
            new Date(`${year}-12-18T18:00:00`),
            new Date(`${year}-12-19T18:00:00`),
            new Date(`${year}-12-20T18:00:00`),
            new Date(`${year}-12-21T18:00:00`)
        ];

        const now = new Date();

        // Calculate how many should be lit
        let litCount = 0;
        candlesSchedule.forEach((time, index) => {
            if (now >= time) {
                litCount = index + 1;
            }
        });

        // If empty (first run), build DOM
        if (container.children.length === 0) {
            // Add 8 candles
            for (let i = 0; i < 8; i++) {
                const candle = document.createElement('div');
                candle.className = 'menorah-candle';
                // Flame
                const flame = document.createElement('div');
                flame.className = 'menorah-flame';
                candle.appendChild(flame);
                container.appendChild(candle);
            }
        }

        // Update Lit State
        const candles = Array.from(container.children);
        candles.forEach((candle, index) => {
            if (index < litCount) {
                candle.classList.add('lit');
            } else {
                candle.classList.remove('lit');
            }
        });
    }

    // Init
    updateHanukkahCandles();
    setInterval(updateHanukkahCandles, 60000);

})();
