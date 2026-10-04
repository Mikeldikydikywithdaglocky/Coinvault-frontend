(() => {
    'use strict';
    const duration = 15000, promptAt = 5000, frameInterval = 40;
    const code = [
        [['comment', '// CoinVault interface preview']],
        [['comment', '// No code is executed. No files are modified.']],
        [['keyword', 'import '], ['plain', '{ View } '], ['keyword', 'from '], ['string', '"coinvault/ui"'], ['plain', ';']],
        [['keyword', 'const '], ['plain', 'route = '], ['string', '"withdrawal"'], ['plain', ';']],
        [['keyword', 'const '], ['plain', 'preview = '], ['keyword', 'new '], ['function', 'View'], ['plain', '(route);']],
        [['keyword', 'const '], ['plain', 'palette = ['], ['string', '"mint", "amber", "violet"'], ['plain', '];']],
        [['keyword', 'const '], ['plain', 'frames = [];']],
        [['plain', 'preview.'], ['function', 'configure'], ['plain', '({ mode: '], ['string', '"read-only"'], ['plain', ' });']],
        [['plain', 'preview.palette = palette;']],
        [['comment', '// Compose the visual sequence']]
    ];
    const layers = [
        'canvas', 'frame', 'surface', 'heading', 'subtitle', 'divider', 'gutter',
        'line-numbers', 'source-text', 'syntax-keywords', 'syntax-strings',
        'syntax-functions', 'syntax-comments', 'caret', 'scroll-track', 'viewport',
        'file-label', 'preview-badge', 'elapsed-time', 'progress-track', 'progress-fill',
        'checkpoint', 'status-text', 'choice-group', 'overwrite-button', 'rewrite-button',
        'focus-ring', 'cancel-button', 'result-icon', 'result-label', 'footer-divider',
        'settings-note', 'continue-button', 'completion-state', 'final-frame'
    ];
    // These tokens are display-only; 10 opening + 35 x 6 layer + 10 closing lines.
    layers.forEach((name,index) => {
        const layer = 'layer' + String(index + 1).padStart(2,'0');
        code.push(
            [['comment', '// Layer ' + String(index + 1).padStart(2,'0') + ': ' + name]],
            [['keyword', 'const '], ['plain', layer + ' = preview.'], ['function', 'layer'], ['plain', '('], ['string', '"' + name + '"'], ['plain', ');']],
            [['plain', layer + '.'], ['function', 'set'], ['plain', '({ accent: palette[' + index % 3 + '], opacity: '], ['keyword', '1'], ['plain', ' });']],
            [['plain', layer + '.'], ['function', 'layout'], ['plain', '({ rows: ' + (index % 4 + 1) + ', gap: ' + (index % 3 + 1) * 4 + ' });']],
            [['plain', 'frames.'], ['function', 'push'], ['plain', '(' + layer + '.'], ['function', 'snapshot'], ['plain', '());']],
            [['plain', 'preview.'], ['function', 'draw'], ['plain', '(' + layer + ');']]
        );
    });
    code.push(
        [['plain', 'preview.'], ['function', 'stage'], ['plain', '('], ['string', '"visual-buffer"'], ['plain', ');']],
        [['keyword', 'const '], ['plain', 'timeline = frames.'], ['function', 'map'], ['plain', '(frame => ({ frame }));']],
        [['plain', 'preview.'], ['function', 'sequence'], ['plain', '(timeline);']],
        [['keyword', 'await '], ['plain', 'preview.'], ['function', 'render'], ['plain', '();']],
        [['plain', 'preview.'], ['function', 'checkpoint'], ['plain', '('], ['string', '"buffer-ready"'], ['plain', ');']],
        [['keyword', 'const '], ['plain', 'nextView = '], ['string', '"methods"'], ['plain', ';']],
        [['plain', 'preview.'], ['function', 'display'], ['plain', '('], ['string', '"visual sequence complete"'], ['plain', ');']],
        [['comment', '// Preview finished. Withdrawal settings are unchanged.']],
        [['comment', '// No code is executed. No files are modified.']],
        [['keyword', 'return '], ['plain', '{ view: nextView, ready: '], ['keyword', 'true'], ['plain', ' };']]
    );
    let active = null;
    function run() {
        if (active) return Promise.resolve(false);
        return new Promise(resolve => {
            const dialog = document.createElement('dialog'); dialog.id = 'cvAuthorizationSequence'; dialog.className = 'cv-dialog cv-authorization-sequence';
            dialog.setAttribute('aria-labelledby','cvSequenceTitle'); dialog.setAttribute('aria-describedby','cvSequenceDisclosure');
            dialog.innerHTML = `<header class="cv-sequence-heading"><div>${CVAccount.icon('terminal')}<h2 id="cvSequenceTitle">Authorization sequence</h2></div><button class="cv-icon" type="button" data-cancel aria-label="Cancel authorization preview" title="Cancel preview">${CVAccount.icon('x')}</button></header><p id="cvSequenceDisclosure" class="cv-sequence-disclosure">Visual preview. No code is executed or account data overwritten.</p><div class="cv-sequence-file"><span>authorization.view</span><span class="cv-sequence-mode">VISUAL PREVIEW</span></div><div class="cv-sequence-code" aria-hidden="true"></div><div class="cv-sequence-meter"><div><span data-stage>Rendering preview</span><time data-time>00:00 / 00:15</time></div><div class="cv-sequence-progress" role="progressbar" aria-label="Visual sequence progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></div><section class="cv-sequence-prompt"><p data-status role="status" aria-live="polite">Preparing the visual buffer.</p><div class="cv-sequence-choices" hidden><button class="cv-button primary" data-overwrite type="button" title="Keep the current visual sequence">${CVAccount.icon('check')}Overwrite</button><button class="cv-button" data-rewrite type="button" title="Restart the visual sequence">${CVAccount.icon('rotate-ccw')}Rewrite</button></div><div class="cv-sequence-result" hidden>${CVAccount.icon('check-circle')}<span data-result></span></div></section><footer class="cv-sequence-footer"><span data-note>Withdrawal settings stay unchanged.</span><button class="cv-button primary" data-continue type="button" hidden>${CVAccount.icon('arrow-right')}Continue</button></footer>`;
            const output = dialog.querySelector('.cv-sequence-code'), progress = dialog.querySelector('[role=progressbar]'), status = dialog.querySelector('[data-status]');
            const choices = dialog.querySelector('.cv-sequence-choices'), continueButton = dialog.querySelector('[data-continue]');
            let total = 0;
            const rows = code.map((tokens,index) => {
                const row = document.createElement('div'); row.className = 'cv-code-row'; row.hidden = true;
                const start = total;
                const number = document.createElement('span'); number.className = 'cv-code-number'; number.textContent = String(index+1).padStart(3,'0');
                const text = document.createElement('code'); row.append(number,text); output.append(row);
                const parts = tokens.map(([color,value]) => {
                    const span = document.createElement('span'); span.className = 'cv-code-'+color; text.append(span);
                    const part = {span,value,start:total,shown:0}; total += value.length; return part;
                });
                return {row,start,parts};
            });
            const input = document.getElementById('authKeyInput'), trigger = document.querySelector('#authStep button[onclick="verifyAuthKey()"]');
            const oldInputDisabled = input.disabled, oldTriggerDisabled = trigger.disabled;
            const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
            let started = performance.now(), decision = '', complete = false, promptShown = false, interval, completionTimer, lastCharacters = -1, currentRow = null;
            active = dialog; input.disabled = true; trigger.disabled = true; trigger.setAttribute('aria-busy','true');
            function render(fraction) {
                const characters = reducedMotion ? total : Math.floor(total*fraction);
                if (characters === lastCharacters) return;
                lastCharacters = characters;
                let current = null;
                for (const {row,start,parts} of rows) {
                    const visible = characters > start;
                    if (row.hidden === visible) row.hidden = !visible;
                    if (visible) current = row;
                    for (const part of parts) {
                        const count = Math.min(part.value.length,Math.max(0,characters-part.start));
                        if (count !== part.shown) { part.span.textContent = part.value.slice(0,count); part.shown = count; }
                    }
                }
                if (reducedMotion || fraction >= 1) current = null;
                if (currentRow !== current) { currentRow?.classList.remove('is-current'); current?.classList.add('is-current'); currentRow = current; }
                output.scrollTop = output.scrollHeight;
            }
            function finish() {
                if (complete || !decision) return;
                complete = true; clearInterval(interval); render(1);
                dialog.classList.add('is-complete'); choices.hidden = true;
                status.textContent = decision === 'rewrite' ? 'Preview rewritten. Ready to continue.' : 'Visual sequence complete.';
                dialog.querySelector('[data-stage]').textContent = 'Preview complete';
                const result = dialog.querySelector('.cv-sequence-result'); result.hidden = false;
                dialog.querySelector('[data-result]').textContent = 'Settings retained. No files modified.';
                if (decision === 'rewrite') { continueButton.hidden = false; continueButton.focus(); }
                else {
                    dialog.querySelector('[data-note]').textContent = 'Opening withdrawal methods...';
                    completionTimer = setTimeout(() => dialog.close('continue'),900);
                }
                output.scrollTop = output.scrollHeight;
            }
            function tick() {
                const elapsed = Math.min(duration,Math.max(0,performance.now()-started));
                const percent = Math.floor(elapsed/duration*100);
                progress.setAttribute('aria-valuenow',String(percent)); progress.firstElementChild.style.width = percent+'%';
                dialog.querySelector('[data-time]').textContent = '00:'+String(Math.floor(elapsed/1000)).padStart(2,'0')+' / 00:15';
                render(elapsed/duration);
                if (!decision && elapsed >= promptAt && !promptShown) {
                    promptShown = true; choices.hidden = false;
                    status.textContent = 'Keep this visual buffer or rewrite it from the start?';
                    dialog.querySelector('[data-stage]').textContent = 'Choose buffer mode';
                    choices.querySelector('button').focus();
                }
                if (elapsed >= duration) {
                    if (decision) finish();
                    else { status.textContent = 'Preview ready. Choose Overwrite to continue or Rewrite to restart.'; clearInterval(interval); }
                }
            }
            dialog.querySelector('[data-overwrite]').onclick = () => {
                decision = 'overwrite'; choices.hidden = true; status.textContent = 'Keeping the current visual buffer.';
                dialog.querySelector('[data-cancel]').focus({preventScroll:true});
                dialog.querySelector('[data-stage]').textContent = 'Completing preview'; tick();
            };
            dialog.querySelector('[data-rewrite]').onclick = () => {
                decision = 'rewrite'; started = performance.now(); choices.hidden = true; promptShown = false;
                dialog.querySelector('[data-cancel]').focus({preventScroll:true});
                status.textContent = 'Rewriting the preview. Your withdrawal settings are unchanged.';
                dialog.querySelector('[data-stage]').textContent = 'Rewriting preview';
                clearInterval(interval); tick(); interval = setInterval(tick,frameInterval);
            };
            continueButton.onclick = () => dialog.close('continue');
            dialog.querySelector('[data-cancel]').onclick = () => dialog.close('cancel');
            const pageHidden = () => dialog.close('cancel');
            const hostDrawer = window.frameElement?.closest('dialog');
            window.addEventListener('pagehide',pageHidden); hostDrawer?.addEventListener('close',pageHidden);
            dialog.addEventListener('close',() => {
                clearInterval(interval); clearTimeout(completionTimer); window.removeEventListener('pagehide',pageHidden);
                hostDrawer?.removeEventListener('close',pageHidden);
                input.disabled = oldInputDisabled; trigger.disabled = oldTriggerDisabled; trigger.removeAttribute('aria-busy');
                active = null; dialog.remove();
                const proceed = complete && dialog.returnValue === 'continue';
                if (!proceed) trigger.focus(); resolve(proceed);
            },{once:true});
            document.body.append(dialog); dialog.showModal(); CVAccount.icons(); tick(); interval = setInterval(tick,frameInterval);
        });
    }
    window.CVAuthorizationSequence = {run,get running() {return active !== null;}};
})();
