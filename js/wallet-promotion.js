(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const promotion = document.getElementById('cvLearnPromotion');
        if (promotion) {
            promotion.hidden = false;
            const slides = [...promotion.querySelectorAll('.cv-promotion-slide')];
            const controls = document.getElementById('cvPromotionControls');
            const dots = [...promotion.querySelectorAll('.cv-promotion-dot')];
            const status = document.getElementById('cvPromotionStatus');
            if (slides.length > 1 && controls && dots.length === slides.length) {
                let current = 0, news = [], newsIndex = 0, fetching = false, fetchedAt = 0, cachedNews = false;
                const allowedHosts = new Set(['bitcoincore.org', 'blog.ethereum.org', 'blog.kraken.com']);
                const api = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ? 'http://localhost:5051/api' : 'https://api.coinvaultnet.com/api';
                async function refreshNews() {
                    if (fetching || document.hidden || Date.now() - fetchedAt < 900000) return;
                    fetching = true; fetchedAt = Date.now(); cachedNews = true;
                    try {
                        const response = await fetch(api + '/wallet/crypto-news', { credentials: 'omit', signal: AbortSignal.timeout(20000) });
                        if (!response.ok) return;
                        const data = await response.json();
                        if (!data.success || !Array.isArray(data.articles)) return;
                        const valid = data.articles.slice(0, 36).filter(item => {
                            try { const url = new URL(item.url); return url.protocol === 'https:' && allowedHosts.has(url.hostname) && !url.username && !url.password && typeof item.title === 'string' && item.title.length <= 240 && typeof item.source === 'string' && Number.isFinite(Date.parse(item.publishedAt)) && Date.parse(item.publishedAt) <= Date.now(); } catch { return false; }
                        });
                        if (valid.length) { news = valid; cachedNews = !!data.stale; newsIndex %= news.length; }
                    } catch { /* Keep publisher links or already loaded, dated articles during outages. */ }
                    finally { fetching = false; }
                }
                function loadNewsSlot(index) {
                    if (!index || !news.length) return;
                    const item = news[newsIndex++ % news.length], slide = slides[index], link = slide.querySelector('a');
                    const theme = ['bitcoin', 'ethereum', 'stablecoins'].includes(item.theme) ? item.theme : 'bitcoin';
                    slide.dataset.theme = theme; link.href = item.url; link.title = item.title;
                    slide.querySelector('h2').textContent = item.title;
                    slide.querySelector('.cv-learn-eyebrow').textContent = 'Crypto news';
                    slide.querySelector('.cv-learn-promotion-copy > p:not(.cv-learn-eyebrow):not(.cv-promotion-meta)').textContent = 'Read the original report from ' + item.source + '.';
                    const meta = slide.querySelector('.cv-promotion-meta'), date = document.createElement('time');
                    date.dateTime = item.publishedAt; date.textContent = new Date(item.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
                    meta.replaceChildren(document.createTextNode((cachedNews ? 'Cached / ' : '') + item.source + ' / '), date);
                    slide.querySelector('img').src = `assets/learn/${theme === 'stablecoins' ? 'stablecoin' : theme}-news.png`;
                    dots[index].title = item.title; dots[index].setAttribute('aria-label', `Show news slot ${index}: ${item.title}`);
                }
                const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
                let timer = null, hovering = false;
                const canPlay = () => !motion.matches && !document.hidden && !hovering &&
                    (!promotion.contains(document.activeElement) || !document.activeElement.matches(':focus-visible'));
                const schedule = () => {
                    clearTimeout(timer);
                    timer = null;
                    if (canPlay()) timer = setTimeout(() => showSlide(current + 1, false), 7000);
                };
                const showSlide = (index, announce = true) => {
                    const next = (index + slides.length) % slides.length;
                    if (next !== current) loadNewsSlot(next);
                    current = next;
                    slides.forEach((slide, position) => { slide.hidden = position !== current; slide.classList.toggle('is-active', position === current); });
                    dots.forEach((dot, position) => { dot.setAttribute('aria-pressed', String(position === current)); });
                    promotion.dataset.theme = slides[current].dataset.theme;
                    if (status && announce) status.textContent = `${current + 1} of ${slides.length}: ${slides[current].querySelector('h2').textContent}`;
                    schedule();
                };

                controls.hidden = false;
                promotion.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; schedule(); } });
                promotion.addEventListener('pointerleave', () => { hovering = false; schedule(); });
                promotion.addEventListener('focusin', schedule);
                promotion.addEventListener('focusout', () => setTimeout(schedule, 0));
                document.addEventListener('visibilitychange', () => { schedule(); refreshNews(); });
                motion.addEventListener('change', schedule);
                let newsTimer = setInterval(refreshNews, 900000);
                window.addEventListener('pagehide', () => { clearTimeout(timer); clearInterval(newsTimer); });
                window.addEventListener('pageshow', event => { schedule(); refreshNews(); if (event.persisted) newsTimer = setInterval(refreshNews, 900000); });
                refreshNews();
                schedule();
                dots.forEach((dot, index) => dot.addEventListener('click', () => showSlide(index)));
                controls.addEventListener('keydown', event => {
                    const steps = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 };
                    if (!(event.key in steps)) return;
                    event.preventDefault();
                    showSlide(steps[event.key]);
                    dots[current].focus({ preventScroll: true });
                });

                // Treat horizontal touch swipes as navigation, never as an article click.
                let start = null, swipedAt = 0;
                promotion.addEventListener('pointerdown', event => {
                    swipedAt = 0;
                    start = event.pointerType === 'touch' && event.target.closest('.cv-learn-promotion-link') ?
                        { x: event.clientX, y: event.clientY, id: event.pointerId } : null;
                });
                promotion.addEventListener('pointerup', event => {
                    if (!start || event.pointerId !== start.id) return;
                    const dx = event.clientX - start.x, dy = event.clientY - start.y;
                    start = null;
                    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
                    swipedAt = Date.now();
                    showSlide(current + (dx < 0 ? 1 : -1));
                });
                promotion.addEventListener('pointercancel', () => { start = null; });
                promotion.addEventListener('click', event => {
                    if (Date.now() - swipedAt < 500 && event.target.closest('.cv-learn-promotion-link')) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                }, true);
            }
        }

        const printButton = document.getElementById('cvPrintLearnGuide');
        if (printButton) {
            printButton.hidden = false;
            printButton.addEventListener('click', () => window.print());
        }
        window.feather?.replace({ 'stroke-width': 1.7 });
    });
})();
