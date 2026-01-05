window.VAAD = window.VAAD || {};
VAAD.shabbat = {
    fetchShabbat: async function () {
        const LAT = VAAD.config.CITY_LAT;
        const LON = VAAD.config.CITY_LON;

        try {
            const res = await fetch(`https://www.hebcal.com/shabbat?cfg=json&geo=pos&latitude=${LAT}&longitude=${LON}&tzid=Asia/Jerusalem&M=on&lg=he`);
            const data = await res.json();

            // Parse Items
            let parsha = '', candle = '--:--', havdalah = '--:--';
            let candleDate = null;

            data.items.forEach(item => {
                if (item.category === 'parashat') parsha = item.hebrew;
                if (item.category === 'candles') {
                    candleDate = new Date(item.date);
                    candle = candleDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                }
                if (item.category === 'havdalah') {
                    havdalah = new Date(item.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                }
            });

            document.getElementById('shabbat-in').textContent = candle;
            document.getElementById('shabbat-out').textContent = havdalah;

            // Title: "זמני השבת - פרשת ..."
            const shabbatTitleEl = document.getElementById('shabbat-title');
            const cleanParsha = VAAD.utils.stripHebrewNiqqud(parsha || '').trim();
            if (shabbatTitleEl) {
                shabbatTitleEl.textContent = cleanParsha ? `זמני השבת - ${cleanParsha}` : 'זמני השבת';
            }

            // Date line should be: "יום שישי, 12 בדצמבר 2025 • כ"ב ... תשפ"ו"
            // Use the candle lighting date (Friday) as reference.
            const d = candleDate || new Date();
            const gy = d.getFullYear();
            const gm = d.getMonth() + 1;
            const gd = d.getDate();

            // Fetch full Converter data
            const dateRes = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${gy}&gm=${gm}&gd=${gd}&g2h=1&lg=he`);
            if (dateRes.ok) {
                const dateData = await dateRes.json();
                const hebrewDate = VAAD.utils.stripHebrewNiqqud(dateData.hebrew || '').trim();

                // Format Gregorian Date: "יום שישי, 12 בדצמבר 2025"
                const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
                const weekdayLabel = weekday.startsWith('יום') ? weekday : `יום ${weekday}`;
                const gregDate = `${weekdayLabel}, ${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}`;

                const fullString = hebrewDate ? `${gregDate} • ${hebrewDate}` : gregDate;
                document.getElementById('shabbat-date-display').textContent = fullString;
            } else {
                // Fallback
                const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
                const weekdayLabel = weekday.startsWith('יום') ? weekday : `יום ${weekday}`;
                const gregDate = `${weekdayLabel}, ${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
                document.getElementById('shabbat-date-display').textContent = gregDate;
            }

        } catch (e) { console.error('Shabbat API error', e); }
    }
};
