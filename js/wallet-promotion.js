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
                let current = 0;
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
                    current = (index + slides.length) % slides.length;
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
                document.addEventListener('visibilitychange', schedule);
                motion.addEventListener('change', schedule);
                window.addEventListener('pagehide', () => clearTimeout(timer));
                window.addEventListener('pageshow', schedule);
                schedule();
                document.getElementById('cvPreviousPromotion')?.addEventListener('click', () => showSlide(current - 1));
                document.getElementById('cvNextPromotion')?.addEventListener('click', () => showSlide(current + 1));
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
