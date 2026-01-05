window.VAAD = window.VAAD || {};
VAAD.newsTicker = {
    originalContent: [],

    init: function () {
        this.fetchNews();
        setInterval(() => this.fetchNews(), 60000 * 5); // 5 min

        // Recalculate ticker when viewport changes
        window.addEventListener('resize', () => {
            const track = document.getElementById('ticker-track');
            if (track) this.setupTickerAnimation(track);
        });
    },

    fetchNews: async function () {
        const track = document.getElementById('ticker-track');
        try {
            // Using Ynet RSS via RSS2JSON proxy
            const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=http://www.ynet.co.il/Integration/StoryRss1854.xml');
            const data = await res.json();

            if (data.status === 'ok' && data.items.length > 0) {
                // Build items with clickable links - improved readability
                const items = data.items.map(i => {
                    const time = new Date(i.pubDate).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                    const title = i.title.replace(/"/g, '');
                    const link = i.link || '#';
                    return `
                        <a href="${link}" target="_blank" class="inline-flex items-center gap-4 px-8 lg:px-12 flex-row-reverse hover:bg-white/5 transition rounded-2xl py-3" dir="rtl" title="לחץ לקריאה">
                            <span class="news-time text-red-300 font-black tabular-nums">${time}</span>
                            <span class="news-title text-white font-semibold hover:text-accent transition">${title}</span>
                            <span class="text-white/30 text-2xl mx-2">●</span>
                        </a>
                    `;
                }).join('');

                // Insert ONE copy only.
                track.innerHTML = items;

                // SAVE FRESH CONTENT for the setup function
                this.originalContent = Array.from(track.children).map(c => c.cloneNode(true));

                this.setupTickerAnimation(track);
            }
        } catch (e) {
            console.log('News Error, using fallback');
            const fallback = `<span class="px-8 text-xl">ברוכים הבאים לאלונים 8 • נשמח לעמוד לשירותכם • יום נעים</span>`;
            track.innerHTML = fallback;

            // SAVE FALLBACK too
            this.originalContent = Array.from(track.children).map(c => c.cloneNode(true));

            this.setupTickerAnimation(track);
        }
    },

    setupTickerAnimation: function (track) {
        try {
            // 1. Reset animation
            track.style.animation = 'none';
            track.innerHTML = '';

            // 2. Get the original items
            if (!this.originalContent || this.originalContent.length === 0) return;
            const originals = this.originalContent;

            // 3. Measure Single Set Width
            const tempContainer = document.createElement('div');
            Object.assign(tempContainer.style, {
                position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap', display: 'inline-flex'
            });
            originals.forEach(node => tempContainer.appendChild(node.cloneNode(true)));
            document.body.appendChild(tempContainer);
            const singleSetWidth = tempContainer.getBoundingClientRect().width;
            document.body.removeChild(tempContainer);

            if (singleSetWidth === 0) return;

            // 4. For seamless RTL carousel:
            // We need content to START from the right edge (off-screen) and scroll left.
            // Then loop back seamlessly.
            const screenWidth = window.innerWidth;

            // Build enough content to fill: screen + one full set (for seamless loop)
            const nodesToAppend = [];
            let currentWidth = 0;
            const targetWidth = screenWidth + singleSetWidth * 2; // Extra buffer for smooth loop

            while (currentWidth < targetWidth) {
                originals.forEach(node => nodesToAppend.push(node.cloneNode(true)));
                currentWidth += singleSetWidth;
            }

            // 5. Append content to track
            const fragment = document.createDocumentFragment();
            nodesToAppend.forEach(node => fragment.appendChild(node));
            track.appendChild(fragment);

            // 6. Calculate animation values
            const totalWidth = track.scrollWidth;
            const scrollDistance = singleSetWidth; // Scroll exactly one set for seamless loop

            // 7. Set CSS Variables
            // --ticker-start: Start position (screen width = off-screen right)
            // --ticker-distance: How far to scroll (one set width for seamless loop)
            track.style.setProperty('--ticker-start', `${screenWidth}px`);
            track.style.setProperty('--ticker-distance', `${scrollDistance}px`);

            // Duration based on total travel distance (slower for readability)
            const pxPerSec = 50; // Reduced from 80 for better readability
            const totalTravel = screenWidth + scrollDistance;
            const duration = totalTravel / pxPerSec;
            track.style.setProperty('--ticker-duration', `${duration}s`);

            // 8. Force reflow and restart animation
            void track.offsetHeight;
            track.style.animation = '';

        } catch (e) {
            console.warn('Ticker setup failed', e);
        }
    }
};
