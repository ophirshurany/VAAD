# אלונים 8 - מסך לובי חכם
## Smart Building Lobby Display System

A responsive, real-time web dashboard designed for 24/7 display on lobby screens, combining community announcements, real-time data, and administrative management.

---

## 📐 Layout Specification

### Grid Structure (1920×1080 optimized)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TOP BAR (64px)                                 │
│  [🏢 ברוכים הבאים לאלונים 8, נתניה]              [Weather│Date│Time]    │
├──────────────────┬────────────────────────────┬─────────────────────────┤
│                  │                            │                         │
│   LEFT COLUMN    │      CENTER COLUMN         │     RIGHT COLUMN        │
│      (25%)       │          (50%)             │         (25%)           │
│                  │                            │                         │
│  ┌────────────┐  │  ┌──────────────────────┐  │  ┌───────────────────┐  │
│  │   NEWS     │  │  │                      │  │  │   LARGE TIME      │  │
│  │ HEADLINES  │  │  │   NOTICES BOARD      │  │  │   DISPLAY         │  │
│  │            │  │  │   (הודעות לדיירים)    │  │  │                   │  │
│  │            │  │  │                      │  │  └───────────────────┘  │
│  │            │  │  │                      │  │  ┌───────────────────┐  │
│  └────────────┘  │  └──────────────────────┘  │  │   BUILDING        │  │
│  ┌────────────┐  │  ┌───────────┬──────────┐  │  │   INFO CARD       │  │
│  │  SHABBAT   │  │  │ SHABBAT   │ WEATHER  │  │  │                   │  │
│  │  TIMES     │  │  │ TIMES     │ CARD     │  │  └───────────────────┘  │
│  └────────────┘  │  └───────────┴──────────┘  │  ┌───────────────────┐  │
│                  │                            │  │   QUICK INFO      │  │
│                  │                            │  └───────────────────┘  │
├──────────────────┴────────────────────────────┴─────────────────────────┤
│                        NEWS TICKER (48px)                                │
│  [📺 חדשות]  ◄──── Scrolling Headlines ────►           [Forecast Time]  │
└─────────────────────────────────────────────────────────────────────────┘
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

## 🔌 RSS News Integration

### Backend Python Script

The provided Python script fetches Ynet headlines:

```python
import feedparser

ynet_rss_url = "http://www.ynet.co.il/Integration/StoryRss1854.xml"
feed = feedparser.parse(ynet_rss_url)

# Extract headlines as list of strings
headlines = [entry.title for entry in feed.entries[:5]]
```

### Backend Implementation Steps

1. **Create a Flask/FastAPI endpoint** that runs the script periodically:

```python
from flask import Flask, jsonify
import feedparser

app = Flask(__name__)

@app.route('/api/news')
def get_news():
    feed = feedparser.parse("http://www.ynet.co.il/Integration/StoryRss1854.xml")
    news_items = [{
        'title': entry.title,
        'link': entry.link,
        'published': entry.published
    } for entry in feed.entries[:8]]
    return jsonify(news_items)
```

2. **Map `entry.title` to ticker items**:
   - Each `entry.title` becomes a headline string
   - Extract timestamp from `entry.published`
   - Format as `{ title: string, time: string, url: string }`

3. **Serve via REST API** or WebSocket for real-time updates

### Frontend Consumption

The ticker component expects an array of news items:

```javascript
// Expected data structure
const newsItems = [
    { title: "כותרת החדשות", time: "14:30", url: "https://..." },
    { title: "כותרת נוספת", time: "14:25", url: "https://..." }
];

// Update ticker function
function updateNewsTicker(newsItems) {
    const ticker = document.getElementById('news-ticker');
    const newsHtml = newsItems.map(item => `
        <span class="inline-flex items-center mx-6">
            <span class="text-danger font-bold ml-2">${item.time}</span>
            <a href="${item.url}" target="_blank" class="text-white">
                ${item.title}
            </a>
            <span class="mx-4 text-white/30">|</span>
        </span>
    `).join('');
    
    // Duplicate for seamless loop
    ticker.innerHTML = newsHtml + newsHtml;
}
```

### Ticker Animation (RTL)

```css
@keyframes marquee-rtl {
    0% { transform: translateX(0%); }
    100% { transform: translateX(50%); }
}

.marquee-content {
    animation: marquee-rtl 60s linear infinite;
    display: flex;
    white-space: nowrap;
}
```

The animation moves content from left to right (RTL direction), creating a seamless loop by duplicating the content.

---

## 🔄 Data Update Intervals

| Data Source | Interval | Function |
|-------------|----------|----------|
| Clock | 1 second | `updateTime()` |
| Weather | 60 minutes | `fetchWeather()` |
| News | 10 minutes | `fetchNewsFromRSS()` |
| Shabbat Times | On load only | `fetchShabbatTimes()` |

---

## 📡 API Endpoints Used

### Weather (Open-Meteo)
```
GET https://api.open-meteo.com/v1/forecast
    ?latitude=31.9424
    &longitude=34.8391
    &current_weather=true
```

### Shabbat Times (Hebcal)
```
GET https://www.hebcal.com/shabbat
    ?cfg=json
    &geonameid=295530
    &M=on
```

### News RSS (via rss2json proxy)
```
GET https://api.rss2json.com/v1/api.json
    ?rss_url=http://www.ynet.co.il/Integration/StoryRss1854.xml
```

---

## 🚀 Deployment

### Local Development
```bash
cd VAAD
python -m http.server 8080
# Open http://localhost:8080
```

### Production Recommendations
1. Serve via nginx/Apache with proper caching headers
2. Set up a backend proxy for RSS feeds (CORS)
3. Consider using a CDN for static assets
4. Enable HTTPS for secure connections

---

## 📱 Features

- ✅ Real-time clock with seconds
- ✅ Weather display (Open-Meteo API)
- ✅ Shabbat times (Hebcal API)
- ✅ News headlines (Ynet RSS)
- ✅ Scrolling news ticker
- ✅ Notice management with localStorage
- ✅ Admin panel for adding notices
- ✅ Priority notices with pulse animation
- ✅ Color-coded categories
- ✅ RTL Hebrew support
- ✅ Responsive design
- ✅ Dark blue Nuvola-style theme

---

## 📄 License

MIT License - Feel free to use and modify for your building lobby display.
