window.VAAD = window.VAAD || {};
VAAD.events = {
    init: function () {
        // Dynamic Event Loader (URL Priority > Date Schedule)
        const params = new URLSearchParams(window.location.search);
        const urlEvent = params.get('event');

        if (urlEvent) {
            this.loadEventScript(urlEvent);
        } else {
            this.checkAndLoadScheduledEvents();
        }
    },

    checkAndLoadScheduledEvents: async function () {
        try {
            const today = new Date();
            const gy = today.getFullYear();
            const gm = today.getMonth() + 1;
            const gd = today.getDate();

            const res = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${gy}&gm=${gm}&gd=${gd}&g2h=1&lg=he`);
            if (!res.ok) return;

            const data = await res.json();
            const HOLIDAY_SCRIPTS = VAAD.config.HOLIDAY_SCRIPTS || {};

            if (data.events && data.events.length > 0) {
                for (const event of data.events) {
                    const cleanName = VAAD.utils.stripHebrewNiqqud(event).trim();

                    for (const [name, src] of Object.entries(HOLIDAY_SCRIPTS)) {
                        if (cleanName.includes(name)) {
                            this.loadEventScriptSrc(src, name);
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Could not check for holidays', e);
        }
    },

    loadEventScriptSrc: function (src, eventId) {
        if (!src) return;
        if (eventId && document.querySelector(`script[data-event-id="${eventId}"]`)) return;
        if (!eventId && document.querySelector(`script[src="${src}"]`)) return;

        console.log(`Loading holiday event: ${eventId || src}`);
        const script = document.createElement('script');
        script.src = src;
        if (eventId) script.dataset.eventId = eventId;
        script.onerror = () => console.warn(`Could not load event script: ${src}`);
        document.body.appendChild(script);
    },

    loadEventScript: function (eventId) {
        const HOLIDAY_SCRIPTS = VAAD.config.HOLIDAY_SCRIPTS || {};
        const src = HOLIDAY_SCRIPTS[eventId];
        if (src) {
            this.loadEventScriptSrc(src, eventId);
        } else {
            console.warn(`Unknown event id: ${eventId}`);
        }
    }
};
