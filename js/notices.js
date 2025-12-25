window.VAAD = window.VAAD || {};
VAAD.notices = {
    list: [],
    currentIndex: 0,
    rotationTimer: null,
    progressTimer: null,

    init: async function () {
        await this.loadNotices();
        this.renderNotices();
        // Set date default
        const dateInput = document.getElementById('input-date');
        if (dateInput) dateInput.valueAsDate = new Date();
        this.setupEventListeners();
    },

    setupEventListeners: function () {
        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => fn.call(this));
        };
        bind('btn-open-admin', this.openAdmin);
        bind('btn-close-admin-top', this.closeAdmin);
        bind('btn-close-admin-bottom', this.closeAdmin);
        bind('btn-clear-inputs', this.clearInputs);
        bind('btn-save-notice', this.saveNotice);
    },

    renderNotices: function () {
        const area = document.getElementById('notices-area');
        const counter = document.getElementById('notice-counter');

        clearInterval(this.rotationTimer);
        clearInterval(this.progressTimer);

        if (this.list.length === 0) {
            area.innerHTML = `
                <div id="empty-state" class="text-center opacity-30">
                    <div class="text-9xl mb-4">📭</div>
                    <div class="text-4xl font-light">אין הודעות חדשות</div>
                </div>
            `;
            if (counter) counter.textContent = 'אין הודעות';
            return;
        }

        if (counter) counter.textContent = `${this.list.length} הודעות`;

        // Start Rotation
        this.showNotice(0);
        this.startRotation();
    },

    startRotation: function () {
        const bar = document.getElementById('notice-progress');
        let width = 0;
        const ROTATION_TIME = VAAD.config.ROTATION_TIME;
        const step = 100 / (ROTATION_TIME / 50); // Update every 50ms

        this.progressTimer = setInterval(() => {
            width += step;
            if (width >= 100) width = 100;
            bar.style.width = width + '%';
        }, 50);

        this.rotationTimer = setInterval(() => {
            this.currentIndex = (this.currentIndex + 1) % this.list.length;
            this.showNotice(this.currentIndex);
            width = 0;
            bar.style.width = '0%';
        }, ROTATION_TIME);
    },

    showNotice: function (index) {
        const area = document.getElementById('notices-area');
        const notice = this.list[index];
        const iconMap = {
            'welcome': '👋', 'event': '🎉', 'important': '⚠️', 'maintenance': '🔧', 'general': '📢'
        };
        const icon = iconMap[notice.type] || '📢';

        // Image vs Wiki vs Icon
        let visualContent = '';

        if (notice.wikiUrl) {
            // Placeholder while loading
            visualContent = `
                    <div id="wiki-content-${notice.id}" class="w-full flex-1 flex flex-col items-center justify-center min-h-[400px]">
                        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-accent mb-4"></div>
                        <div class="text-blue-200 text-xl">טוען פרט מעניין...</div>
                    </div>
                `;

        } else if (notice.imageUrl) {
            const hasBody = (notice.content || '').trim().length > 0;
            const mediaH = hasBody ? 'h-[45%]' : 'h-[60%]';
            visualContent = `
                <div class="w-full ${mediaH} flex items-center justify-center ${hasBody ? 'mb-4' : 'mb-6'}">
                    <img
                        src="${notice.imageUrl}"
                        class="max-h-full max-w-full w-auto h-auto rounded-3xl shadow-3xl object-contain bg-black/20 border border-white/10"
                        alt="Notice Image"
                        loading="lazy"
                        decoding="async"
                    >
                </div>
            `;
        } else {
            visualContent = `<div class="text-8xl mb-6 filter drop-shadow-lg">${icon}</div>`;
        }

        const urgencyClass = notice.urgent ? 'border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : '';
        const urgencyBadge = notice.urgent ? '<div class="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">דחוף</div>' : '';

        // Animation classes
        const html = `
    <div class="w-full h-full flex flex-col items-center justify-start text-center animate-fade-in relative p-4 ${urgencyClass} rounded-3xl bg-white/5">
        ${urgencyBadge}
        ${visualContent} 
        ${(!notice.wikiUrl && notice.title) ? ('<h2 class="text-5xl lg:text-7xl font-black text-white mb-4 leading-tight drop-shadow-md max-w-5xl">' + notice.title + '</h2>') : ''}
        ${(!notice.wikiUrl && notice.content) ? ('<p class="text-4xl lg:text-5xl text-blue-100 font-light whitespace-pre-line leading-relaxed max-w-5xl">' + notice.content + '</p>') : ''}
        <div class="mt-6 text-blue-300 font-medium text-xl border-t border-white/10 pt-4 px-8">
            פורסם ב: ${notice.date} • ועד הבית
        </div>
        
        <button data-action="delete-notice" class="absolute bottom-4 left-4 text-white/10 hover:text-red-500 transition p-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
    </div>
    `;
        area.innerHTML = html;

        // Wire delete button
        const delBtn = area.querySelector('button[data-action="delete-notice"]');
        if (delBtn) {
            delBtn.addEventListener('click', () => this.deleteNotice(notice.id));
        }

        // Fetch Wiki
        if (notice.wikiUrl) {
            // Using VAAD.wiki if available
            if (VAAD.wiki && VAAD.wiki.fetchWikiFact) {
                VAAD.wiki.fetchWikiFact(notice.wikiUrl, `wiki-content-${notice.id}`);
            }
        }
    },

    loadNotices: async function () {
        if (window.location.protocol === 'file:') {
            console.warn('Running from file:// - notices.json fetch may be blocked.');
        }

        try {
            const res = await fetch('notices.json?_=' + Date.now());
            if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json)) {
                    this.list = this.mapNoticesFromJson(json);
                    this.saveNotices();
                    const counter = document.getElementById('notice-counter');
                    if (counter) counter.textContent = `${this.list.length} הודעות`;
                    return;
                }
            }
        } catch (e) {
            console.warn('Could not load notices.json, falling back to localStorage', e);
        }

        const stored = localStorage.getItem('lobby-notices');
        this.list = stored ? JSON.parse(stored) : [];
        const counter = document.getElementById('notice-counter');
        if (counter) counter.textContent = `${this.list.length} הודעות`;
    },

    saveNotices: function () {
        localStorage.setItem('lobby-notices', JSON.stringify(this.list));
    },

    mapNoticesFromJson: function (items) {
        const mapType = {
            general: 'general',
            important: 'important',
            event: 'event',
            welcome: 'welcome',
            maintenance: 'maintenance',
            vaad: 'important',
            holiday: 'event'
        };
        return items
            .filter(n => (n.type || 'notice') === 'notice')
            .map(n => ({
                id: String(n.id ?? Date.now()),
                title: n.title || '',
                content: n.content || '',
                type: mapType[n.category] || mapType[n.type] || 'general',
                date: n.date || new Date().toISOString().split('T')[0],
                urgent: Boolean(n.priority),
                imageUrl: n.imageUrl ?? null,
                iframeUrl: n.iframeUrl ?? null,
                wikiUrl: n.wikiUrl ?? null
            }));
    },

    // --- Admin Functions ---
    openAdmin: function () { document.getElementById('admin-modal').classList.remove('hidden'); },
    closeAdmin: function () { document.getElementById('admin-modal').classList.add('hidden'); },
    clearInputs: function () {
        document.getElementById('input-title').value = '';
        document.getElementById('input-content').value = '';
        document.getElementById('input-urgent').checked = false;
    },
    saveNotice: function () {
        const title = document.getElementById('input-title').value;
        const content = document.getElementById('input-content').value;
        if (!title) return alert('נא להזין כותרת');

        const newNotice = {
            id: Date.now().toString(),
            title: title,
            content: content,
            type: document.getElementById('input-type').value,
            date: document.getElementById('input-date').value,
            urgent: document.getElementById('input-urgent').checked
        };

        this.list.unshift(newNotice);
        this.saveNotices();
        this.renderNotices();
        this.closeAdmin();
        this.clearInputs();
    },
    deleteNotice: function (id) {
        if (confirm('למחוק הודעה זו?')) {
            this.list = this.list.filter(n => n.id !== id.toString());
            this.saveNotices();
            this.renderNotices();
        }
    }
};

// Global shims for inline event handlers (compatibility layer)
window.openAdmin = () => VAAD.notices.openAdmin();
window.closeAdmin = () => VAAD.notices.closeAdmin();
window.saveNotice = () => VAAD.notices.saveNotice();
window.deleteNotice = (id) => VAAD.notices.deleteNotice(id); // Usually bound dynamically, but good to have
window.clearInputs = () => VAAD.notices.clearInputs();
