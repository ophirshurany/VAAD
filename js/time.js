window.VAAD = window.VAAD || {};
VAAD.time = {
    init: function () {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    },
    updateTime: function () {
        const now = new Date();
        const timeEl = document.getElementById('clock-time');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

        const weekday = now.toLocaleDateString('he-IL', { weekday: 'long' });
        const dayTextEl = document.getElementById('clock-day-text');
        if (dayTextEl) dayTextEl.textContent = weekday;

        const dateStr = now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const dateEl = document.getElementById('clock-date');
        if (dateEl) dateEl.textContent = dateStr;
    }
};
