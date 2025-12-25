document.addEventListener('DOMContentLoaded', async () => {
    // 1. Time & Date
    if (VAAD.time) VAAD.time.init();
    if (VAAD.hebrewDate) VAAD.hebrewDate.init();

    // 2. Weather (External module, assumes it attaches to VAAD.weather)
    if (window.VAAD && VAAD.weather && typeof VAAD.weather.fetchWeather === 'function') {
        const LAT = VAAD.config.CITY_LAT;
        const LON = VAAD.config.CITY_LON;
        VAAD.weather.fetchWeather({ lat: LAT, lon: LON });
        setInterval(() => VAAD.weather.fetchWeather({ lat: LAT, lon: LON }), 600000); // 10 min
    } else {
        console.warn('weather.js not loaded; weather widget will not update');
    }

    // 3. Shabbat
    if (VAAD.shabbat) VAAD.shabbat.fetchShabbat();

    // 4. News
    if (VAAD.newsTicker) VAAD.newsTicker.init();

    // 5. Useful Info
    if (VAAD.usefulInfo) await VAAD.usefulInfo.init();

    // 6. Notices
    if (VAAD.notices) await VAAD.notices.init();

    // 7. Events
    if (VAAD.events) VAAD.events.init();

    // 8. Global Widget Links (Cleanup of inline onclicks)
    const weatherWidget = document.getElementById('weather-widget');
    if (weatherWidget) {
        weatherWidget.addEventListener('click', () => {
            window.open('https://www.accuweather.com/he/il/beer-yaaqov/1281409/weather-forecast/1281409', '_blank');
        });
    }

    const shabbatWidget = document.getElementById('shabbat-widget');
    if (shabbatWidget) {
        shabbatWidget.addEventListener('click', () => {
            window.open('https://www.hebcal.com/', '_blank');
        });
    }
});
