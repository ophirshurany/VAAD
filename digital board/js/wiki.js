window.VAAD = window.VAAD || {};
VAAD.wiki = {
    cache: { timestamp: 0, html: null, imgSrc: null, textHtml: null },

    fetchWikiFact: async function (url, containerId) {
        try {
            const now = Date.now();
            const cacheDuration = 2 * 60 * 60 * 1000; // 2 hours

            // 1. Check Cache
            if (this.cache && this.cache.timestamp && (now - this.cache.timestamp < cacheDuration)) {
                console.log('Using cached Wiki fact');
                this.renderWikiFact(this.cache.html, this.cache.imgSrc, this.cache.textHtml, containerId);
                return;
            }

            // 2. Fetch Fresh
            console.log('Fetching fresh Wiki fact');
            // Cache bust using clear URL param
            const cacheBust = new Date().getTime();
            // FIXED: Removed space between & and cb
            const finalUrl = `${url}&cb=${cacheBust}`;

            // Use allorigins to bypass CORS
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(finalUrl)}`;

            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error('Proxy error');

            const data = await res.json();
            const html = data.contents;

            // Parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extract Content
            // 1. Image
            const imgEl = doc.querySelector('.mw-file-description img') || doc.querySelector('a.image img');
            let imgSrc = '';
            if (imgEl) {
                // Fix relative URLs if any (Wikipedia usually gives full connection-relative //)
                imgSrc = imgEl.src;
                if (imgSrc.startsWith('//')) imgSrc = 'https:' + imgSrc;
            }

            // 2. Text
            // Usually in the first few Ps or Divs of mw-parser-output
            const parserOutput = doc.querySelector('.mw-parser-output');
            let textHtml = '';

            if (parserOutput) {
                // Remove "See also", "References", "External links" etc. if they appear
                // Ideally we just want the text up to the "קטע בנושא" line

                // Simple heuristic: Get text from paragraphs until we hit the bottom links
                const paras = Array.from(parserOutput.querySelectorAll('p, div'));
                let foundText = false;

                for (const p of paras) {
                    let text = p.innerText.trim();
                    // Skip empty or utility lines
                    if (!text) continue;

                    const isEndMarker = text.includes('קטע בנושא');

                    // "Did you know that..." usually starts the fact
                    if (text.includes('הידעת') || foundText || text.length > 20) {
                        let cleanHtml = p.innerHTML.replace(/\[\d+\]/g, '').replace(/\[HE\]/g, '');

                        if (isEndMarker) {
                            // Try to strip the marker "קטע בנושא" and anything after
                            cleanHtml = cleanHtml.replace(/<span[^>]*>קטע בנושא.*<\/span>/i, '');
                            if (cleanHtml.includes('קטע בנושא')) cleanHtml = cleanHtml.split('קטע בנושא')[0];

                            textHtml += `<div class="mb-4 leading-relaxed">${cleanHtml}</div>`;
                            break; // End of fact
                        }

                        textHtml += `<div class="mb-4 leading-relaxed">${cleanHtml}</div>`;
                        foundText = true;
                    }
                }
            }

            if (!textHtml) textHtml = '<div class="text-2xl">לא נמצא מידע. נסה שוב מאוחר יותר.</div>';

            // 3. Update Cache
            this.cache = { timestamp: now, html: html, imgSrc: imgSrc, textHtml: textHtml };

            // 4. Render
            this.renderWikiFact(html, imgSrc, textHtml, containerId);

        } catch (e) {
            console.error('Wiki fetch error', e);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '<div class="text-2xl text-red-300">שגיאה בטעינת הנתונים</div>';
            }
        }
    },

    renderWikiFact: function (rawHtml, imgSrc, textHtml, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Build UI
        container.innerHTML = `
                 <div class="w-full flex flex-col h-full bg-slate-800/50 p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                    <!-- Title -->
                    <div class="flex items-center justify-center gap-3 mb-6 shrink-0 z-10">
                        <span class="text-5xl">💡</span>
                        <h2 class="text-5xl font-black text-gold drop-shadow-md">הידעת?</h2>
                    </div>

                    <!-- Content Wrapper (Scrollable if needed) -->
                    <div class="flex-1 overflow-y-auto custom-scroll pr-2 relative z-10 flex flex-col 4xl:flex-row items-center 4xl:items-start gap-6">

                        ${imgSrc ? `
                        <div class="shrink-0 w-48 h-48 xl:w-64 xl:h-64 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl bg-black/20">
                            <img src="${imgSrc}" class="w-full h-full object-cover" alt="Wikipedia Image">
                        </div>
                        ` : ''}

                        <div class="text-6xl 2xl:text-5xl text-white font-light text-right leading-relaxed wiki-text">
                            ${textHtml}
                        </div>
                    </div>

                    <div class="mt-4 text-center text-white/30 text-xl border-t border-white/5 pt-2 z-10">
                        מתוך ויקיפדיה
                    </div>

                    <!-- Background Decoration -->
                    <div class="absolute -bottom-10 -left-10 text-[15rem] opacity-5 select-none pointer-events-none">?</div>
                </div>
            `;

        // Post-process links to be visible
        const links = container.querySelectorAll('.wiki-text a');
        links.forEach(a => {
            a.style.color = '#7dd3fc'; // Sky 300
            a.style.textDecoration = 'none';
            a.style.fontWeight = '500';
        });
    }
};
