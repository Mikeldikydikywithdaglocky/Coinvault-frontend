(() => {
    'use strict';
    const panel = new URLSearchParams(location.search).get('panel') === '1';
    document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('cv-account');
        if (panel) document.body.classList.add('cv-withdraw-panel');
        const main = document.querySelector('body>main'); main.classList.add('cv-legacy-main');
        const header = document.createElement('header'); header.className = 'cv-withdraw-header'; header.innerHTML = `${CVAccount.icon('arrow-up')}<h1>Withdraw funds</h1>`;
        if (panel) document.body.prepend(header); else main.prepend(header);
        const country = document.getElementById('withdrawCountry');
        const wrapper = document.createElement('div'); wrapper.style.position = 'relative'; country.before(wrapper); wrapper.append(country);
        const lock = document.createElement('span'); lock.className = 'cv-country-lock'; lock.innerHTML = CVAccount.icon('lock'); wrapper.append(lock);
        for (const id of ['momoSubmitBtn','bankSubmitBtn','cryptoSubmitBtn']) document.getElementById(id).innerHTML = `${CVAccount.icon('arrow-up')}<span>Review withdrawal</span>`;
        if (panel) mountContext(main,wrapper);
        const forms = [['momoForm','momoAmount','momoNumber'],['bankForm','bankAmount','bankAccount'],['cryptoForm','cryptoAmount','cryptoAddress']];
        for (const [formId, amountId, recipientId] of forms) {
            const section = document.createElement('section'); section.className = 'cv-withdraw-summary'; section.setAttribute('aria-label','Withdrawal summary');
            const heading = document.createElement('h3'); heading.textContent = 'You are withdrawing'; heading.className = 'cv-section-title';
            const payout = document.createElement('p'); payout.className = 'cv-payout-value';
            const dl = document.createElement('dl'); section.append(heading,payout,dl);
            document.getElementById(formId).querySelector('button').before(section);
            const update = () => {
                const amount = document.getElementById(amountId).value, recipient = document.getElementById(recipientId).value;
                const countryName = country.selectedOptions[0]?.textContent || 'Detecting...';
                const labelId = formId === 'momoForm' ? 'momoLocalCurrencyCode' : formId === 'bankForm' ? 'bankLocalCurrencyCode' : 'countryCurrencySummary';
                const currency = document.getElementById(labelId)?.textContent || '';
                payout.textContent = amount ? `${currency} ${Number(amount).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}` : '--';
                dl.replaceChildren();
                const method = formId === 'momoForm' ? getSelectedCountryConfig()?.mobileMoneyLabel || 'Mobile Money' : formId === 'bankForm' ? 'Bank transfer' : 'Crypto transfer';
                const rows = [['Method',method],...(formId === 'momoForm' ? [['Provider',getSelectedProvider()?.name || '--']] : []),['Country',countryName],['Recipient',recipient || '--']];
                for (const [name,value] of rows) {
                    const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = name; dd.textContent = value; dl.append(dt,dd);
                }
            };
            document.getElementById(formId).addEventListener('input',update); document.getElementById(formId).addEventListener('change',update);
            new MutationObserver(update).observe(country,{childList:true,subtree:true});
            document.addEventListener('cv:withdraw-selection',update);
            const amountInput = document.getElementById(amountId), shortcuts = document.createElement('div'); shortcuts.className = 'cv-amount-shortcuts';
            for (const [label,fraction] of [['25%',.25],['50%',.5],['Max',1]]) {
                const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.setAttribute('aria-label',`${label} of available withdrawal amount`);
                button.onclick = () => {
                    const config = getSelectedCountryConfig(); if (!config) return;
                    const lock = getKeyLockData(sessionStorage.getItem('currentAuthKey'));
                    const availableUSD = Math.min(userBalance,Number(lock?.amountRemaining) || 0);
                    amountInput.value = String(Math.floor(convertUSDToLocal(availableUSD,config.currencyCode) * fraction * 100) / 100);
                    amountInput.dispatchEvent(new Event('input',{bubbles:true}));
                };
                shortcuts.append(button);
            }
            const amountRow = document.createElement('div'); amountRow.className = 'cv-amount-row'; amountInput.before(amountRow); amountRow.append(amountInput,shortcuts);
            const available = document.createElement('p'); available.className = 'cv-available-local'; amountRow.after(available);
            const updateAvailable = () => {
                const config = getSelectedCountryConfig(), lock = getKeyLockData(sessionStorage.getItem('currentAuthKey'));
                available.textContent = config && lock ? `Available: ${config.currencyCode} ${convertUSDToLocal(Math.min(userBalance,Number(lock.amountRemaining) || 0),config.currencyCode).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})} / ${lock.usesRemaining} uses remaining` : '';
            };
            document.addEventListener('cv:withdraw-selection',updateAvailable); document.getElementById(formId).addEventListener('input',updateAvailable);
            if (formId === 'momoForm') { const accountName = document.getElementById('momoName').parentElement; amountRow.parentElement.before(accountName); }
            updateAvailable(); update();
        }
        document.querySelectorAll('label').forEach(label => { if (!label.htmlFor) { const input = label.parentElement.querySelector('input[id],select[id]'); if (input) label.htmlFor = input.id; } });
        window.CVWithdrawalReview = reviewWithdrawal;
        const originalSubmit = window.submitWithdrawal;
        let submissionPending = false;
        window.submitWithdrawal = async function(method) {
            if (submissionPending) return;
            submissionPending = true;
            try { return await originalSubmit(method); } finally { submissionPending = false; }
        };
        const originalVerify = window.verifyOTP;
        let verificationPending = false;
        window.verifyOTP = async function() {
            if (verificationPending) return;
            verificationPending = true;
            try { return await originalVerify(); } finally { verificationPending = false; }
        };
        const originalSuccess = window.showSuccess;
        if (panel && typeof originalSuccess === 'function') {
            window.showSuccess = function(reference) { originalSuccess(reference); parent.postMessage({type:'cv:withdraw-complete'}, location.origin); };
            window.redirectNow = function() { if (typeof countdownTimer !== 'undefined' && countdownTimer) clearInterval(countdownTimer); parent.postMessage({type:'cv:withdraw-close'},location.origin); };
        }
        const back = main.querySelector('button[onclick="window.history.back()"]');
        if (panel && back) back.onclick = () => parent.postMessage({type:'cv:withdraw-close'},location.origin);
        if (panel) document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) parent.postMessage({type:'cv:withdraw-close'},location.origin); });
        document.addEventListener('cv:quotes', () => { if (typeof updateCryptoAmount === 'function') updateCryptoAmount(); });
        CVAccount.loadQuotes(); CVAccount.icons();
    });
    function mountContext(main,countryWrapper) {
        const context = document.createElement('section'); context.className = 'cv-withdraw-context'; context.hidden = true;
        context.innerHTML = `<div class="cv-authorized"><span>${CVAccount.icon('check')}Authorization complete</span><button class="cv-icon" type="button" title="Change authorization" aria-label="Change authorization">${CVAccount.icon('edit-2')}</button></div><label for="withdrawCountry">Detected country</label><div id="cvContextCountry"></div><p class="cv-muted" id="cvContextLocation"></p><label>Method</label><div class="cv-method-tabs" role="group" aria-label="Withdrawal method" id="cvContextMethods"></div><div class="cv-provider-select" id="cvContextProvider" hidden><label for="cvProviderSelect">Provider</label><div><span id="cvProviderLogo"></span><select id="cvProviderSelect"><option value="">Select provider</option></select></div></div>`;
        document.getElementById('authStep').before(context);
        context.querySelector('.cv-authorized button').onclick = () => { document.getElementById('formStep').classList.add('hidden'); goToAuthStep(); };
        document.getElementById('cvContextCountry').append(countryWrapper);
        for (const id of ['momoMethodBtn','bankMethodBtn','cryptoMethodBtn']) document.getElementById('cvContextMethods').append(document.getElementById(id));
        const providerSelect = document.getElementById('cvProviderSelect');
        providerSelect.onchange = () => {
            if (!providerSelect.value) return;
            selectCarrier(providerSelect.value);
            document.getElementById('cvProviderLogo').innerHTML = buildProviderLogoMarkup(getSelectedProvider());
            document.dispatchEvent(new Event('cv:withdraw-selection'));
        };
        function sync() {
            const hidden = id => document.getElementById(id).classList.contains('hidden');
            context.hidden = !hidden('authStep') || !hidden('otpStep') || !hidden('successModal');
            const method = withdrawalData.method;
            for (const [id,value] of [['momoMethodBtn','momo'],['bankMethodBtn','bank'],['cryptoMethodBtn','crypto']]) document.getElementById(id).setAttribute('aria-pressed',String(method === value && hidden('methodStep')));
            const config = getSelectedCountryConfig();
            document.getElementById('cvContextLocation').textContent = config ? `${config.name} / ${config.currencyCode} payout` : document.getElementById('withdrawLocationStatus').textContent;
            const providers = config?.mobileMoneyProviders || [];
            const ids = providers.map(provider => provider.id).join(',');
            if (providerSelect.dataset.providers !== ids) {
                providerSelect.replaceChildren(new Option('Select provider',''));
                for (const provider of providers) providerSelect.append(new Option(provider.name,provider.id));
                providerSelect.dataset.providers = ids;
            }
            const selected = getSelectedProvider(); providerSelect.value = selected?.id || '';
            document.getElementById('cvProviderLogo').innerHTML = selected ? buildProviderLogoMarkup(selected) : CVAccount.icon('smartphone');
            document.getElementById('cvContextProvider').hidden = context.hidden || method !== 'momo' || !hidden('methodStep');
            document.dispatchEvent(new Event('cv:withdraw-selection')); CVAccount.icons();
        }
        const observer = new MutationObserver(sync);
        for (const id of ['authStep','methodStep','carrierStep','formStep','otpStep','successModal','momoMethodBtn','bankMethodBtn','cryptoMethodBtn']) observer.observe(document.getElementById(id),{attributes:true,attributeFilter:['class']});
        observer.observe(document.getElementById('withdrawCountry'),{childList:true,subtree:true}); sync();
    }
    function reviewWithdrawal(data) {
        return new Promise(resolve => {
            const dialog = document.createElement('dialog'); dialog.className = 'cv-dialog cv-withdraw-review';
            const method = data.method === 'momo' ? getSelectedCountryConfig()?.mobileMoneyLabel || 'Mobile Money' : data.method === 'bank' ? 'Bank transfer' : 'Crypto transfer';
            const rows = [['Method',method],...(data.details.carrierName ? [['Provider',data.details.carrierName]] : []),['Country',data.countryName],['Recipient',data.details.number || data.details.account || data.details.address],['Account name',data.details.name || '--']];
            dialog.innerHTML = `<div class="cv-dialog-heading"><h2>Review withdrawal</h2><button class="cv-icon" type="button" title="Close review" aria-label="Close review">${CVAccount.icon('x')}</button></div><p class="cv-payout-value">${CVAccount.escape(data.currencyCode)} ${Number(data.amountLocal).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}</p><dl>${rows.map(([name,value]) => `<dt>${CVAccount.escape(name)}</dt><dd>${CVAccount.escape(value)}</dd>`).join('')}</dl><p>Confirm with the verification code sent to your email.</p><div class="cv-review-actions"><button class="cv-button" data-back type="button">Back</button><button class="cv-button primary" data-confirm type="button">${CVAccount.icon('mail')}Send verification code</button></div>`;
            document.body.append(dialog); dialog.querySelector('.cv-icon').onclick = () => dialog.close('cancel'); dialog.querySelector('[data-back]').onclick = () => dialog.close('cancel'); dialog.querySelector('[data-confirm]').onclick = () => dialog.close('confirm');
            dialog.addEventListener('close',() => { const confirmed = dialog.returnValue === 'confirm'; dialog.remove(); resolve(confirmed); },{once:true});
            dialog.showModal(); CVAccount.icons();
        });
    }
})();
