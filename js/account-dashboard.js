(() => {
    'use strict';
    const A = window.CVAccount;
    const $ = id => document.getElementById(id);
    let frameCompleted = false, privateMode = sessionStorage.getItem('cvPrivate') === 'true';
    function value(amount) { return A.money(amount); }
    function assetReadout(asset) {
        if (!Number.isFinite(Number(asset.price)) || Number(asset.price) <= 0) return 'Price unavailable';
        const price = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: asset.symbol === 'USDT' ? 4 : 2 }).format(Number(asset.price));
        return `${price} USD`;
    }
    function assets() {
        if (!A.state.loaded || A.state.error || A.state.walletError) return [];
        const merged = new Map();
        for (const wallet of A.currentWallets()) for (const asset of wallet.assets || []) {
            const price = window.CVWalletMarket ? CVWalletMarket.priceFor(asset) : asset.price;
            const previous = merged.get(asset.symbol) || { ...asset, price, balance: 0, usd: 0 };
            previous.balance += Number(asset.balance);
            previous.usd = previous.usd !== null && Number.isFinite(Number(price)) && price !== null ? previous.usd + Number(asset.balance) * Number(price) : null;
            merged.set(asset.symbol, previous);
        }
        // Empty display rows do not become wallet holdings or overwrite recorded deposits.
        for (const [symbol, name] of [['ETH', 'Ethereum'], ['USDT', 'Tether']]) {
            if (!merged.has(symbol)) {
                const price = window.CVWalletMarket ? CVWalletMarket.priceFor({ symbol, price: null }) : A.state.quotes[symbol] ?? null;
                merged.set(symbol, { symbol, name, balance: 0, usd: 0, price });
            }
        }
        return [...merged.values()];
    }
    function transactionKind(tx) { const type = String(tx.type || '').toLowerCase(); return type.includes('withdraw') ? 'withdrawal' : type.includes('receive') ? 'received' : 'sent'; }
    function transactions() {
        const chain = A.currentWallets().flatMap(wallet => (wallet.transactions || []).map(tx => ({ ...tx, blockchain: true, walletAddress: wallet.address })));
        const combined = [...A.state.transactions, ...chain];
        const unique = [...new Map(combined.map((tx, index) => [tx.id || tx.hash || tx.reference || `item-${index}`, tx])).values()];
        return unique.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
    }
    function activityMarkup(list) {
        if (!list.length) return `<div class="cv-empty">${A.state.activityError ? 'Activity is temporarily unavailable.' : 'No transactions yet.'}</div>`;
        return list.map(tx => {
            const kind = transactionKind(tx), incoming = kind === 'received';
            const date = new Date(tx.timestamp || tx.date);
            const formattedDate = Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            let amount;
            if (tx.blockchain) amount = `${incoming ? '+' : '-'}${Number(tx.amount || 0).toLocaleString('en', { maximumFractionDigits: 8 })} ${tx.symbol || 'BTC'}`;
            else { const local = tx.amountLocal ?? tx.amount; amount = `${incoming ? '+' : '-'}${tx.currencyCode || 'USD'} ${Number(local || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
            const brand = kind === 'withdrawal' ? CVPaymentLogos.withdrawalLogo(tx) : null;
            const title = brand ? `${brand.label} withdrawal` : `${incoming ? 'Received' : 'Sent'} ${tx.symbol || tx.cryptocurrency || 'crypto'}`;
            const glyph = A.icon(brand ? brand.fallback : incoming ? 'arrow-down' : 'arrow-up');
            const logo = brand?.url ? `<img class="cv-transaction-logo" data-withdrawal-logo src="${A.escape(brand.url)}" alt="${A.escape(brand.label)} logo"><span hidden>${glyph}</span>` : glyph;
            const status = tx.status || 'Unavailable';
            const amountClass = incoming ? 'cv-positive' : kind === 'withdrawal' ? 'cv-negative' : '';
            return `<div class="cv-transaction"><span class="cv-transaction-icon ${kind}">${logo}</span><div><strong>${A.escape(title)}</strong><p>${A.escape(formattedDate)}</p>${tx.displayName ? `<p>${A.escape(tx.displayName)}</p>` : ''}</div><div class="cv-transaction-amount cv-sensitive ${amountClass}">${A.escape(amount)}<small>${A.escape(status)}</small></div></div>`;
        }).join('');
    }
    function render() {
        const state = A.state, wallets = A.currentWallets();
        const warning = state.error || state.walletError;
        $('cvLoadError').hidden = !warning; $('cvErrorMessage').textContent = warning || '';
        const title = state.selected === 'all' ? 'All wallets' : wallets[0]?.label || 'All wallets';
        $('cvWalletTitle').textContent = title; $('cvBreadcrumbWallet').textContent = title;
        const count = `${wallets.length} ${wallets.length === 1 ? 'wallet' : 'wallets'}`;
        $('cvWalletCount').textContent = state.loaded ? count : 'Account unavailable'; $('cvDetailsCount').textContent = count;
        const total = state.loaded && !warning && wallets.every(wallet => wallet.balance !== null && Number.isFinite(Number(wallet.balance))) ? wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0) : null;
        $('cvTotalBalance').textContent = value(total);
        renderBtcPrice();
        const list = assets();
        $('cvAssets').innerHTML = list.length ? list.map(asset => {
            const symbol = /^[A-Z0-9]{1,10}$/.test(asset.symbol) ? asset.symbol : '';
            const image = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE'].includes(symbol) ? `<img src="assets/crypto/${symbol.toLowerCase()}.svg" alt="">` : A.icon('circle');
            return `<article class="cv-asset"><div class="cv-asset-brand">${image}<div><strong>${A.escape(asset.name || symbol)}</strong><small>${A.escape(symbol)}</small></div></div><div class="cv-asset-amount cv-sensitive">${asset.balance.toLocaleString('en', { maximumFractionDigits: 8 })} ${A.escape(symbol)}</div><div class="cv-asset-value cv-asset-market-price" data-asset-value="${A.escape(symbol)}" title="Market price">${assetReadout(asset)}</div><button class="cv-link" data-asset="${A.escape(symbol)}">View asset ${A.icon('arrow-right')}</button></article>`;
        }).join('') : `<div class="cv-empty"><p>${warning ? 'Assets are temporarily unavailable.' : wallets.length ? 'Balances are not available yet.' : 'No wallet connected.'}</p>${!warning && !wallets.length ? '<button class="cv-button" data-cv-connect>Connect wallet</button>' : ''}</div>`;
        $('cvAssets').querySelectorAll('[data-asset]').forEach(button => {
            button.onclick = () => showAsset(button.dataset.asset);
            const link = document.createElement('a');
            link.className = 'cv-asset-mobile-link';
            link.href = `trade.html?asset=${encodeURIComponent(button.dataset.asset)}&from=dashboard`;
            link.setAttribute('aria-label', `View ${button.dataset.asset} trading`);
            button.closest('.cv-asset').appendChild(link);
        });
        $('cvAssets').querySelectorAll('[data-cv-connect]').forEach(button => button.onclick = A.showConnect);
        $('cvDetailsAddresses').innerHTML = wallets.map(wallet => `<div class="cv-detail-row"><small>${A.escape(wallet.label)}</small><div class="cv-address"><span title="${A.escape(wallet.address)}">${A.escape(A.short(wallet.address))}</span><button class="cv-icon" data-copy="${A.escape(wallet.address)}" aria-label="Copy Bitcoin address" title="Copy Bitcoin address">${A.icon('copy')}</button></div>${wallet.unavailable ? '<small>Balance unavailable</small>' : ''}</div>`).join('');
        $('cvDetailsAddresses').querySelectorAll('[data-copy]').forEach(button => button.onclick = () => A.copy(button.dataset.copy));
        $('cvDisconnect').style.display = state.loaded && !warning && state.wallets.some(wallet => wallet.type === 'bluewallet') ? 'inline-flex' : 'none';
        const payoutWallet = state.wallets.find(wallet => wallet.type === 'bluewallet');
        document.querySelectorAll('[data-cv-withdraw]').forEach(button => { button.disabled = !state.loaded || !!warning || !payoutWallet || !(Number(payoutWallet.balance) > 0); button.title = button.disabled ? 'Connect a funded Bitcoin wallet to withdraw' : 'Withdraw'; });
        renderActivity(); A.icons();
    }
    function renderActivity() {
        const list = transactions(); $('cvRecentActivity').innerHTML = activityMarkup(list.slice(0, 3));
        $('cvAllActivity').innerHTML = activityMarkup(list.filter(tx => $('cvActivityFilter').value === 'all' || transactionKind(tx) === $('cvActivityFilter').value)); A.icons();
        document.querySelectorAll('[data-withdrawal-logo]').forEach(image => image.addEventListener('error', () => {
            image.hidden = true; image.nextElementSibling.hidden = false;
        }, { once: true }));
    }
    function renderBtcPrice() {
        if (window.CVWalletMarket) return CVWalletMarket.render();
        const price = Number(A.state.quotes.BTC);
        $('cvBtcPrice').textContent = Number.isFinite(price) && price > 0 ? `${A.money(price)} USD` : 'BTC price unavailable';
    }
    function setTab(activity) {
        $('cvBalancesPanel').hidden = activity; $('cvActivityPanel').hidden = !activity;
        for (const [id, selected] of [['cvBalancesTab', !activity], ['cvActivityTab', activity]]) { $(id).setAttribute('aria-selected', String(selected)); $(id).tabIndex = selected ? 0 : -1; }
    }
    function setupActivityFilter() {
        const select = $('cvActivityFilter'), wrapper = document.createElement('div');
        wrapper.className = 'cv-activity-filter';
        wrapper.innerHTML = `<button type="button" class="cv-filter-trigger" id="cvFilterTrigger" aria-haspopup="menu" aria-expanded="false" aria-controls="cvFilterMenu">${A.icon('filter')}<span>All activity</span>${A.icon('chevron-down')}</button><div class="cv-filter-menu" id="cvFilterMenu" role="menu" aria-label="Filter transactions" hidden>${[...select.options].map(option => `<button type="button" role="menuitemradio" tabindex="-1" aria-checked="${option.value === select.value}" data-filter="${A.escape(option.value)}"><span>${A.escape(option.text)}</span>${A.icon('check')}</button>`).join('')}</div>`;
        select.after(wrapper); select.hidden = true;
        const trigger = wrapper.querySelector('.cv-filter-trigger'), menu = wrapper.querySelector('.cv-filter-menu'), items = [...menu.querySelectorAll('button')];
        function close(restore = false) { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (restore) trigger.focus(); }
        function open() { menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); (items.find(item => item.dataset.filter === select.value) || items[0]).focus(); }
        trigger.onclick = () => menu.hidden ? open() : close();
        trigger.onkeydown = event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(); } };
        menu.onclick = event => {
            const item = event.target.closest('[data-filter]'); if (!item) return;
            select.value = item.dataset.filter;
            trigger.querySelector('span').textContent = item.querySelector('span').textContent;
            items.forEach(button => button.setAttribute('aria-checked', String(button === item)));
            select.dispatchEvent(new Event('change')); close(true);
        };
        menu.onkeydown = event => {
            const current = items.indexOf(document.activeElement);
            if (event.key === 'Escape') { event.preventDefault(); close(true); }
            if (event.key === 'Tab') close();
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault(); const index = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                items[index].focus();
            }
        };
        document.addEventListener('click', event => { if (!wrapper.contains(event.target)) close(); });
        wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(); });
    }
    function showAsset(symbol) {
        const asset = assets().find(item => item.symbol === symbol); if (!asset) return;
        location.href = `trade.html?asset=${encodeURIComponent(symbol)}&from=dashboard`;
    }
    function openWithdrawal() {
        const wallet = A.state.wallets.find(item => item.type === 'bluewallet');
        if (!wallet || !(wallet.balance > 0)) return A.toast('Connect a funded Bitcoin wallet to withdraw.');
        localStorage.setItem('walletData', JSON.stringify(wallet));
        if (!$('cvWithdrawFrame').getAttribute('src')) $('cvWithdrawFrame').src = 'withdraw.html?panel=1';
        $('cvWithdrawDrawer').showModal(); document.body.style.overflow = 'hidden';
    }
    document.addEventListener('cv:data', render); document.addEventListener('cv:walletchange', render);
    document.addEventListener('cv:quotes', renderBtcPrice);
    function renderMarketValues() {
        for (const asset of assets()) {
            const field = [...document.querySelectorAll('[data-asset-value]')].find(node => node.dataset.assetValue === asset.symbol);
            if (field) field.textContent = assetReadout(asset);
        }
    }
    document.addEventListener('cv:quotes', renderMarketValues);
    document.addEventListener('cv:market', renderMarketValues);
    document.addEventListener('DOMContentLoaded', () => {
        $('cvMobileWallet').onchange = event => A.select(event.target.value);
        document.querySelectorAll('[data-cv-connect]').forEach(button => button.onclick = A.showConnect);
        document.querySelectorAll('[data-cv-receive]').forEach(button => button.onclick = () => location.href = 'receive.html');
        document.querySelectorAll('[data-cv-withdraw]').forEach(button => button.onclick = openWithdrawal);
        document.querySelectorAll('[data-cv-more]').forEach(button => button.onclick = () => {
            const menu = button.nextElementSibling, opening = menu.hidden;
            document.querySelectorAll('.cv-dropdown').forEach(item => item.hidden = true); document.querySelectorAll('[data-cv-more]').forEach(item => item.setAttribute('aria-expanded', 'false'));
            menu.hidden = !opening; button.setAttribute('aria-expanded', String(opening));
        });
        document.addEventListener('click', event => { if (!event.target.closest('.cv-menu-wrap')) { document.querySelectorAll('.cv-dropdown').forEach(menu => menu.hidden = true); document.querySelectorAll('[data-cv-more]').forEach(button => button.setAttribute('aria-expanded', 'false')); } });
        document.addEventListener('keydown', event => { if (event.key === 'Escape') { document.querySelectorAll('.cv-dropdown').forEach(menu => menu.hidden = true); document.querySelectorAll('[data-cv-more]').forEach(button => button.setAttribute('aria-expanded', 'false')); } });
        $('cvBalancesTab').onclick = () => setTab(false); $('cvActivityTab').onclick = () => setTab(true); $('cvViewActivity').onclick = () => { setTab(true); $('cvActivityTab').focus(); };
        document.querySelector('.cv-tabs').onkeydown = event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const activity = $('cvActivityTab').getAttribute('aria-selected') !== 'true'; setTab(activity); $(activity ? 'cvActivityTab' : 'cvBalancesTab').focus(); } };
        $('cvActivityFilter').onchange = renderActivity; $('cvRetry').onclick = () => { A.loadQuotes(true); A.load(true); };
        setupActivityFilter();
        $('cvHideBalance').onclick = () => { privateMode = !privateMode; sessionStorage.setItem('cvPrivate', String(privateMode)); applyPrivacy(); };
        $('cvAssetClose').onclick = () => $('cvAssetDialog').close();
        $('cvCloseWithdraw').onclick = () => $('cvWithdrawDrawer').close();
        $('cvWithdrawDrawer').addEventListener('close', () => { document.body.style.overflow = ''; if (frameCompleted) { $('cvWithdrawFrame').removeAttribute('src'); frameCompleted = false; } });
        $('cvDisconnect').onclick = async () => {
            if (!confirm('Disconnect all connected BlueWallet Bitcoin addresses from this account? This does not delete any wallet or move any funds.')) return;
            const button = $('cvDisconnect'); button.disabled = true;
            try { await A.request('/wallet/disconnect/bluewallet', { method: 'DELETE' }); sessionStorage.setItem('cvSelectedWallet', 'all'); A.state.selected = 'all'; await A.load(true); A.toast('Wallet disconnected.'); } catch (error) { A.toast(error.message); } finally { button.disabled = false; }
        };
        window.addEventListener('hashchange', () => { if (location.hash === '#activity') setTab(true); });
        if (location.hash === '#activity') setTab(true);
        window.addEventListener('message', event => {
            if (event.origin !== location.origin || event.source !== $('cvWithdrawFrame').contentWindow) return;
            if (event.data?.type === 'cv:withdraw-complete') { frameCompleted = true; A.load(true); }
            if (event.data?.type === 'cv:withdraw-close') $('cvWithdrawDrawer').close();
        });
        applyPrivacy(); if (A.state.loaded || A.state.error) render();
        setInterval(() => { if (document.visibilityState === 'visible') A.loadQuotes(true); }, 60000);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') A.loadQuotes(true); });
    });
    function applyPrivacy() { document.body.classList.toggle('cv-private', privateMode); $('cvHideBalance').setAttribute('aria-pressed', String(privateMode)); $('cvHideBalance').setAttribute('aria-label', privateMode ? 'Show balances' : 'Hide balances'); $('cvHideBalance').title = privateMode ? 'Show balances' : 'Hide balances'; $('cvHideBalance').innerHTML = A.icon(privateMode ? 'eye-off' : 'eye'); A.icons(); document.dispatchEvent(new CustomEvent('cv:privacy')); }
})();
