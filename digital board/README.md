# אלונים 8 - מסך לובי (VAAD)

דאשבורד Web למסך לובי (RTL) שמיועד לעבודה רציפה 24/7 על טלוויזיה/מסך, כולל הודעות ועד/דיירים, תחזית מזג אוויר ל-3 ימים, זמני שבת ותזכורות, וטיקר חדשות.

---

## 📐 Layout (עדכני)

### מבנה מסך (1920×1080)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ TOP HEADER                                                                  │
│ [תחזית 3 ימים (קליק לאקו-וויז'ר)]  [כותרת הבניין]  [אירועי חג (אוטומטי)]   │
├──────────────────────┬─────────────────────────────────────────────────────┤
│ RIGHT SIDEBAR (≈25%) │ CENTER (≈75%)                                        │
│ ┌──────────────────┐ │ ┌─────────────────────────────────────────────────┐ │
│ │ DATE & TIME      │ │ │ לוח הודעות (מציג הודעה אחת כל פעם + פס התקדמות) │ │
│ │ כולל תאריך עברי  │ │ │ + כפתור הוספה (Admin Modal)                      │ │
│ └──────────────────┘ │ └─────────────────────────────────────────────────┘ │
│ ┌──────────────────┐ │                                                     │
│ │ מידע לדייר        │ │                                                     │
│ │ (גלילה אוטומטית) │ │                                                     │
│ └──────────────────┘ │                                                     │
│ ┌──────────────────┐ │                                                     │
│ │ זמני השבת         │ │                                                     │
│ │ כותרת: פרשה       │ │                                                     │
│ │ שורה: יום שישי +  │ │                                                     │
│ │ תאריך עברי         │ │                                                     │
│ └──────────────────┘ │                                                     │
├──────────────────────┴─────────────────────────────────────────────────────┤
│ BOTTOM TICKER: "מבזקים" (Ynet RSS) – גלילה איטית וקריאה                    │
└────────────────────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| `≥1024px` (lg) | Full 3-column grid |
| `<1024px` | Single column, stacked |

### Spacing System

- **Grid gaps**: `16px` (mobile) / `20px` (desktop)
- **Card padding**: `20px` - `24px`
- **Section margins**: `16px` - `24px`
- **Border radius**: `16px` (cards), `12px` (inner elements)

---

## 🎨 Color Tokens

### Nuvola-Style Dark Blue Monochromatic Palette

```css
/* Primary Colors */
--primary: #0a1628;        /* Darkest navy - main background */
--secondary: #0f2847;      /* Dark blue - header/footer */
--surface: #1a3a5c;        /* Medium blue - card backgrounds (dark) */
--surfaceAlt: #2a4a6c;     /* Lighter blue - hover states */

/* Accent Colors */
--accent: #3b82f6;         /* Bright blue - highlights, links */
--accentLight: #60a5fa;    /* Light accent - hover states */

/* Text Colors */
--textPrimary: #ffffff;    /* White - primary text on dark */
--textSecondary: #94a3b8;  /* Muted - secondary text */
--textMuted: #64748b;      /* Very muted - tertiary text */

/* Card Colors */
--cardBg: #ffffff;         /* White - card backgrounds */
--cardBorder: #e2e8f0;     /* Light gray - card borders */

/* Semantic Colors */
--success: #10b981;        /* Green - weather temp, positive */
--warning: #f59e0b;        /* Orange/amber - warnings */
--danger: #ef4444;         /* Red - alerts, news timestamps */
```

### Gradient Definitions

```css
/* Background gradient */
background: linear-gradient(135deg, #0a1628 0%, #0f2847 100%);

/* Card header gradient */
background: linear-gradient(to left, #3b82f6 0%, #2563eb 100%);

/* Shabbat card gradient */
background: linear-gradient(145deg, #1e40af 0%, #1e3a8a 100%);

/* Dark card gradient */
background: linear-gradient(145deg, #1a3a5c 0%, #0f2847 100%);
```

---

## 📝 Typography Scale

### Font Family
```css
font-family: 'Heebo', sans-serif;
```

### Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `display` | `4.5rem` (72px) | 700 | Main time display |
| `title` | `2.25rem` (36px) | 700 | Welcome header |
| `section` | `1.5rem` (24px) | 600 | Section titles |
| `body` | `1.125rem` (18px) | 400 | Body text |
| `small` | `0.875rem` (14px) | 400 | Secondary text |
| `tiny` | `0.75rem` (12px) | 400 | Timestamps, labels |

### Special Styles

```css
/* Time display - tabular numbers */
.time-display {
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
}
```

---

## 🔌 Data sources

### Weather (3-Day Forecast)
- נתונים: **Open‑Meteo** (תחזית יומית ל-3 ימים)
- מציג: שם יום, אייקון מזג אוויר, טמפרטורה מקסימלית/מינימלית
- קישור “תחזית מלאה”: **AccuWeather (Beer Yaakov)**

### Shabbat / Parasha
- זמני שבת + פרשה: **Hebcal Shabbat JSON**
- תאריך עברי: **Hebcal Converter JSON**
- הווידג’ט מציג:
  - כותרת: `זמני השבת - פרשת ...`
  - שורה: `יום שישי, ... • ...` (לועזי + עברי)

### News ticker
- מקור: **Ynet RSS** דרך `rss2json`.
- הטיקר משתמש באנימציה רציפה שמחושבת לפי רוחב התוכן (50px/sec) לקריאות טובה יותר.
- כל כותרת כוללת שעת פרסום וקישור לכתבה המלאה.

---

## 🔄 רענון נתונים (ברירת מחדל)

| Data Source | Interval | Function |
|-------------|----------|----------|
| שעון | כל שנייה | `updateTime()` |
| תאריך עברי (היום) | כל שעה | `updateHebrewDateToday()` |
| מזג אוויר | כל 10 דקות | `fetchWeather()` |
| חדשות | כל 5 דקות | `fetchNews()` |
| שבת | בטעינה | `fetchShabbat()` |
| הודעות | בטעינה | `loadNotices()` |

---

## 📡 API Endpoints

### Weather (Open-Meteo) - 3-Day Forecast
```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=31.9424
    &longitude=34.8391
    &daily=temperature_2m_max,temperature_2m_min,weathercode
    &forecast_days=3
    &timezone=Asia%2FJerusalem
```

### Shabbat Times (Hebcal)
```
GET https://www.hebcal.com/shabbat
    ?cfg=json
    &geonameid=295530
    &M=on
```

### News RSS (via rss2json proxy)
### Hebrew Date (Hebcal Converter)
```
GET https://www.hebcal.com/converter
        ?cfg=json
        &gy=YYYY
        &gm=MM
        &gd=DD
        &g2h=1
        &lg=he
```

---

## 🗂️ Notices: `notices.json`

הודעות הלוח נשמרות בקובץ `notices.json` (שורש הפרויקט).

### מבנה פריט
```json
{
    "id": "...",
    "title": "...",
    "content": "...",
    "category": "general|important|event|welcome|maintenance|vaad|holiday",
    "date": "YYYY-MM-DD",
    "color": "#...",
    "priority": false,
    "type": "notice"
}
```

> הערה: פריטים עם `"type": "news"` מסוננים ולא מוצגים בלוח ההודעות.

### למה לפעמים לא רואים שינוי אחרי עריכת `notices.json`?
אם פותחים את `index.html` ישירות (כלומר `file://`), הדפדפן עלול לחסום `fetch('notices.json')`.
לכן מומלץ לעבוד מקומית דרך HTTP (ראה למטה).
```
GET https://api.rss2json.com/v1/api.json
    ?rss_url=http://www.ynet.co.il/Integration/StoryRss1854.xml
```

---

## 🚀 הרצה מקומית

```bash
cd VAAD
python -m http.server 8000
# Open http://localhost:8000/index.html
```

### טיפים
- אם ה־`notices.json` לא מתעדכן בדפדפן: רענון קשיח (Ctrl+F5).
- הקוד מוסיף cache-busting ל־`notices.json` (`?_=`) כדי למנוע קאש על JSON.

### Production Recommendations
1. Serve via nginx/Apache with proper caching headers
2. Set up a backend proxy for RSS feeds (CORS)
3. Consider using a CDN for static assets
4. Enable HTTPS for secure connections

---

## ✨ Features (עדכני)

- ✅ שעון + תאריך לועזי + **תאריך עברי (היום)**
- ✅ מזג אוויר (Open‑Meteo) + קישור ל‑AccuWeather
- ✅ זמני שבת + פרשה (Hebcal) + תאריך עברי לשבת
- ✅ טיקר חדשות (Ynet RSS דרך rss2json) – גלילה רציפה ללא “עצירות”
- ✅ הודעות דיירים נטענות מ־`notices.json` עם גיבוי ל־localStorage
- ✅ מסך הודעות מתחלף (מציג הודעה אחת כל X שניות) עם פס התקדמות
- ✅ Admin modal להוספת הודעות מקומית
- ✅ תמיכה RTL

---

## 📄 License

MIT License - Feel free to use and modify for your building lobby display.
