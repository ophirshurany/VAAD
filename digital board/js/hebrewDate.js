window.VAAD = window.VAAD || {};
VAAD.hebrewDate = {
    init: function () {
        this.updateHebrewDateToday();
        setInterval(() => this.updateHebrewDateToday(), 60 * 60 * 1000);
    },
    updateHebrewDateToday: async function () {
        const el = document.getElementById('clock-hebrew-date');
        if (!el) return;
        try {
            const today = new Date();
            const gy = today.getFullYear();
            const gm = today.getMonth() + 1;
            const gd = today.getDate();
            const res = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${gy}&gm=${gm}&gd=${gd}&g2h=1&lg=he`);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();

            // Depends on VAAD.utils
            const hebrew = data.hebrew || '';
            const clean = (VAAD.utils && VAAD.utils.stripHebrewNiqqud)
                ? VAAD.utils.stripHebrewNiqqud(hebrew)
                : hebrew.replace(/[\u0591-\u05C7]/g, '');

            el.textContent = clean.trim() || '--';
        } catch (e) {
            console.warn('Hebrew date fetch failed', e);
            el.textContent = '--';
        }
    }
};
