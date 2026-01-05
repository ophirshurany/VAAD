// Weather module (Option B: single global namespace)
// Exposes: window.VAAD.weather.fetchWeather({ lat, lon, forecastDays, timezone })

(function () {
    window.VAAD = window.VAAD || {};
    window.VAAD.weather = window.VAAD.weather || {};

    const DEFAULT_FORECAST_DAYS = 3;
    const DEFAULT_TIMEZONE = 'Asia/Jerusalem';

    function getWeatherIcon(code, isDay) {
        const icons = {
            0: isDay ? '☀️' : '🌙',
            1: isDay ? '🌤️' : '🌙',
            2: isDay ? '⛅' : '☁️',
            3: '☁️',
            45: '🌫️', 48: '🌫️',
            51: '🌧️', 53: '🌧️', 55: '🌧️',
            61: '🌧️', 63: '🌧️', 65: '🌧️',
            80: '🌦️', 81: '🌦️', 82: '🌦️',
            95: '⛈️', 96: '⛈️', 99: '⛈️'
        };
        return icons[code] || (isDay ? '☀️' : '🌙');
    }

    // Kept for future use (currently not displayed directly in the widget)
    function getWeatherHebrewSummary({ code, cloud, pop, precip, isDay }) {
        const hasPrecip = (typeof precip === 'number' && precip > 0.0) || (typeof pop === 'number' && pop >= 50);
        if (hasPrecip) {
            if ([80, 81, 82].includes(code)) return 'ממטרים קצרים';
            if ([61, 63, 65, 66, 67].includes(code)) return 'גשום';
            if ([51, 53, 55].includes(code)) return 'טפטוף';
            if ([95, 96, 99].includes(code)) return 'סופות רעמים';
            return 'ממטרים קצרים';
        }

        if (typeof cloud === 'number') {
            if (cloud >= 85) return 'מעונן';
            if (cloud >= 45) return 'מעונן חלקית';
            if (cloud >= 20) return isDay ? 'שמשי בעיקר' : 'בהיר בעיקר';
            return isDay ? 'שמשי' : 'בהיר';
        }

        if (code === 0) return isDay ? 'שמשי' : 'בהיר';
        if (code === 1) return isDay ? 'שמשי בעיקר' : 'בהיר בעיקר';
        if (code === 2) return 'מעונן חלקית';
        if (code === 3) return 'מעונן';
        if ([45, 48].includes(code)) return 'ערפילי';
        if ([51, 53, 55].includes(code)) return 'טפטוף';
        if ([61, 63, 65].includes(code)) return 'גשום';
        if ([80, 81, 82].includes(code)) return 'ממטרים קצרים';
        if ([95, 96, 99].includes(code)) return 'סופות רעמים';
        return 'מזג אוויר';
    }

    async function fetchWeather({ lat, lon, forecastDays = DEFAULT_FORECAST_DAYS, timezone = DEFAULT_TIMEZONE } = {}) {
        try {
            if (typeof lat !== 'number' || typeof lon !== 'number') {
                console.warn('VAAD.weather.fetchWeather: missing lat/lon');
                return;
            }

            const url = `https://api.open-meteo.com/v1/forecast` +
                `?latitude=${encodeURIComponent(lat)}` +
                `&longitude=${encodeURIComponent(lon)}` +
                `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
                `&forecast_days=${encodeURIComponent(forecastDays)}` +
                `&timezone=${encodeURIComponent(timezone)}`;

            const res = await fetch(url, { cache: 'no-store' });
            const data = await res.json();
            if (!data || !data.daily) return;

            const daily = data.daily;
            const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
            const today = new Date();

            for (let i = 0; i < forecastDays; i++) {
                const dayEl = document.getElementById(`weather-day-${i}`);
                if (!dayEl) continue;

                const high = Math.round(daily.temperature_2m_max[i]);
                const low = Math.round(daily.temperature_2m_min[i]);
                const code = daily.weathercode[i];

                const dayNameEl = dayEl.querySelector('span:first-child');
                if (dayNameEl) {
                    if (i === 0) {
                        dayNameEl.textContent = 'היום';
                    } else if (i === 1) {
                        dayNameEl.textContent = 'מחר';
                    } else {
                        const futureDate = new Date(today);
                        futureDate.setDate(today.getDate() + i);
                        dayNameEl.textContent = hebrewDays[futureDate.getDay()];
                    }
                }

                const iconEl = dayEl.querySelector('.weather-icon');
                if (iconEl) iconEl.textContent = getWeatherIcon(code, true);

                const highEl = dayEl.querySelector('.weather-high');
                const lowEl = dayEl.querySelector('.weather-low');
                if (highEl) highEl.textContent = `${high}°`;
                if (lowEl) lowEl.textContent = `${low}°`;
            }
        } catch (e) {
            console.error('Weather error', e);
        }
    }

    window.VAAD.weather.getWeatherIcon = getWeatherIcon;
    window.VAAD.weather.getWeatherHebrewSummary = getWeatherHebrewSummary;
    window.VAAD.weather.fetchWeather = fetchWeather;
})();
