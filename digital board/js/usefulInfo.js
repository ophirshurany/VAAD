window.VAAD = window.VAAD || {};
VAAD.usefulInfo = {
    items: [],

    init: async function () {
        await this.loadUsefulInfoItems();
    },

    loadUsefulInfoItems: async function () {
        try {
            // Note: when opened via file://, fetch() to local files is often blocked.
            if (window.location.protocol === 'file:') {
                console.warn('Running from file:// - residents_info.json fetch may be blocked. Use a local HTTP server for reliable loading.');
            }

            const response = await fetch('residents_info.json?_=' + Date.now());
            if (!response.ok) throw new Error(`Failed to load residents_info.json (HTTP ${response.status})`);

            const data = await response.json();
            this.items = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error loading useful info items:', error);
            this.items = [];
        }

        // Render regardless (shows fallback UI if empty)
        this.initUsefulInfoCarousel();
    },

    initUsefulInfoCarousel: function () {
        const list = document.getElementById('useful-info-list');
        if (!list) return;

        // If the JSON hasn't loaded yet (or is empty), show a friendly placeholder.
        if (!Array.isArray(this.items) || this.items.length === 0) {
            list.innerHTML = `
                <div class="useful-info-item flex items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 text-right">
                    <div class="text-xl xl:text-2xl text-white/70 font-semibold">אין מידע להצגה</div>
                </div>
            `;
            list.style.setProperty('--scroll-duration', `20s`);
            return;
        }

        // Build items HTML
        const buildItemsHtml = () => this.items.map(item => {
            const valueClass = item.valueClass ? item.valueClass : '';
            return `
                <div class="useful-info-item flex items-center justify-between p-3 3xl:p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition text-right mb-4">
                    <div class="flex-1 min-w-0">
                        <div class="font-black text-4xl 4xl:text-4xl mb-1">${item.title}</div>
                        <div class="text-4xl 3xl:text-4xl text-blue-200 font-semibold ${valueClass}">${item.value}</div>
                    </div>
                    <div class="text-5xl 4xl:text-6xl opacity-90 mr-3">${item.icon}</div>
                </div>
            `;
        }).join('');

        // Duplicate content for seamless loop
        const itemsHtml = buildItemsHtml();
        list.innerHTML = itemsHtml + itemsHtml;

        // Calculate scroll duration based on content height
        // Slower = more readable
        const scrollSpeed = 30; // pixels per second
        requestAnimationFrame(() => {
            const singleSetHeight = list.scrollHeight / 2;
            const duration = singleSetHeight / scrollSpeed;
            list.style.setProperty('--scroll-duration', `${duration}s`);
        });
    }
};
