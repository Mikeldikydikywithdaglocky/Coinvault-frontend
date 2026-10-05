(() => {
    'use strict';
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    const hosts = local ? ['http://localhost:5051/api'] : ['https://api.coinvaultnet.com/api', 'https://coinvault-backend-production.up.railway.app/api'];
    const state = { user: null, wallets: [], quotes: {}, selected: sessionStorage.getItem('cvSelectedWallet') || 'all', transactions: [], loaded: false, error: null, walletError: null, activityError: null };
    const $ = (id) => document.getElementById(id);
    const money = (value, currency = 'USD') => Number.isFinite(Number(value)) && value !== null ? new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(value)) : '--';
    const short = (value) => value ? `${value.slice(0, 7)}...${value.slice(-5)}` : 'No address';
    const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const icon = (name) => `<i data-feather="${name}"></i>`;
    function icons() { window.feather?.replace({ 'stroke-width': 1.7 }); }
    function toast(message) {
        document.querySelector('.cv-toast')?.remove();
        const node = document.createElement('div'); node.className = 'cv-toast'; node.setAttribute('role', 'status'); node.textContent = message; document.body.append(node); setTimeout(() => node.remove(), 4000);
    }
    async function request(path, options = {}) {
        const token = localStorage.getItem('token');
        const method = options.method || 'GET';
        for (let i = 0; i < hosts.length; i++) {
            try {
                const response = await fetch(hosts[i] + path, { ...options, method, credentials: 'omit', signal: options.signal || AbortSignal.timeout(18000), headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined });
                if (response.status === 401) {
                    const error = new Error('Your session has expired. Please sign in again.'); error.status = 401; throw error;
                }
                if (!response.ok) {
                    const error = new Error(response.status === 400 ? 'Please check your details and try again.' : 'We could not load this information. Please try again shortly.'); error.status = response.status; throw error;
                }
                const result = await response.json();
                if (result.success === false) { const error = new Error('We could not complete your request. Please try again.'); error.status = 400; throw error; }
                return result;
            } catch (error) {
                // Only read requests may fail over; never repeat a financial mutation.
                if (method === 'GET' && i < hosts.length - 1 && (!error.status || error.status >= 500)) continue;
                if (!error.status) error.message = 'Unable to connect. Please try again shortly.';
                throw error;
            }
        }
    }
    function currentWallets() { return state.selected === 'all' ? state.wallets : state.wallets.filter(wallet => wallet.address === state.selected); }
    function select(address) {
        state.selected = address === 'all' || state.wallets.some(wallet => wallet.address === address) ? address : 'all';
        sessionStorage.setItem('cvSelectedWallet', state.selected); renderWallets(); document.dispatchEvent(new CustomEvent('cv:walletchange', { detail: state }));
    }
    function publicUser(user) { return { id: user.id || user._id || '', _id: user._id || user.id || '', username: user.username || '', email: user.email || '', walletAddress: user.walletAddress || '', emailVerified: !!user.emailVerified }; }
    function savedWithdrawalBalance(wallet) {
        if (!wallet?.address || !localStorage.getItem('lastBalanceUpdate')) return wallet;
        try {
            const saved = JSON.parse(localStorage.getItem('walletData') || 'null');
            // Preserve the original withdrawal page's balance adjustment for this wallet.
            if (saved?.address === wallet.address && typeof saved.balance === 'number' && Number.isFinite(saved.balance) && saved.balance >= 0) return { ...wallet, balance: saved.balance };
        } catch { /* Ignore an invalid saved wallet and use the service response. */ }
        return wallet;
    }
    let pending, quotesPending, quotesFetchedAt = 0, menuOrigin;
    async function loadQuotes(force = false) {
        if (quotesPending) return quotesPending;
        if (!force && Date.now() - quotesFetchedAt < 120000) return state.quotes;
        quotesPending = (async () => {
            try {
                const response = await fetch('https://api.coinbase.com/v2/exchange-rates?currency=USD', { signal: AbortSignal.timeout(9000) });
                if (!response.ok) throw new Error('Quote unavailable');
                const data = await response.json();
                state.quotes = {};
                for (const symbol of ['BTC','ETH','USDT','BNB','SOL','XRP','ADA','DOGE']) {
                    const rate = Number(data.data?.rates?.[symbol]);
                    if (Number.isFinite(rate) && rate > 0) state.quotes[symbol] = 1 / rate;
                }
                quotesFetchedAt = Date.now();
            } catch { state.quotes = {}; }
            finally { quotesPending = null; document.dispatchEvent(new CustomEvent('cv:quotes', { detail: state.quotes })); }
            return state.quotes;
        })();
        return quotesPending;
    }
    async function load(force = false) {
        if (pending) return pending;
        if (state.loaded && !force) return state;
        pending = (async () => {
            state.error = state.walletError = state.activityError = null;
            try {
                const result = await request('/auth/me');
                if (!result.user) throw new Error('We could not load your account. Please try again.');
                state.user = publicUser(result.user);
                const [connected, activity] = await Promise.allSettled([request('/wallet/connected-wallets'), request('/wallet/transactions')]);
                const wallet = connected.status === 'fulfilled' ? savedWithdrawalBalance(connected.value.wallet) : null;
                state.walletError = connected.status === 'rejected' ? connected.reason.message : null;
                state.activityError = activity.status === 'rejected' ? activity.reason.message : null;
                if ([connected, activity].some(item => item.status === 'rejected' && item.reason.status === 401)) { const error = new Error('Your session has expired. Please sign in again.'); error.status = 401; throw error; }
                state.wallets = wallet?.address ? [{ ...wallet, type: connected.value.walletType || 'bluewallet', label: 'Bitcoin wallet', assets: (wallet.assets || []).filter(asset => Number.isFinite(Number(asset.balance))), transactions: wallet.transactions || [] }] : [];
                // Additional saved Bitcoin addresses are hydrated separately, never assigned a sample balance.
                const known = [...(result.user.connectedWallets || []).filter(item => item.type === 'bluewallet'), ...(result.user.importedWallets || [])];
                if (result.user.walletAddress) known.push({ address: result.user.walletAddress, label: 'CoinVault wallet' });
                let price = Number(wallet?.assets?.find(asset => asset.symbol === 'BTC')?.price) || null;
                if (!price && known.length) { await loadQuotes(); price = state.quotes.BTC || null; }
                const addresses = [...new Map(known.filter(item => item.address && /^(bc1|[13])[a-zA-Z0-9]{20,90}$/.test(item.address)).map(item => [item.address, item])).values()].filter(item => !state.wallets.some(w => w.address === item.address));
                const extra = await Promise.all(addresses.map(async item => {
                    try {
                        const data = await request(`/wallet/balance/${encodeURIComponent(item.address)}`);
                        const amount = Number(data.balance);
                        if (!Number.isFinite(amount)) throw new Error('Invalid balance');
                        return { address: item.address, label: item.label || 'Bitcoin wallet', type: item.type || 'imported', balance: price ? amount * price : null, assets: [{ symbol: 'BTC', name: 'Bitcoin', balance: amount, price }], transactions: [] };
                    } catch { return { address: item.address, label: item.label || 'Bitcoin wallet', type: item.type || 'imported', balance: null, assets: [], transactions: [], unavailable: true }; }
                }));
                state.wallets.push(...extra);
                state.transactions = activity.status === 'fulfilled' ? activity.value.transactions || [] : [];
                localStorage.setItem('user', JSON.stringify(state.user));
                if (wallet) {
                    localStorage.setItem('connectedWallet', JSON.stringify({ type: connected.value.walletType, data: wallet }));
                    localStorage.setItem('walletData', JSON.stringify(wallet));
                } else if (connected.status === 'fulfilled') {
                    localStorage.removeItem('connectedWallet'); localStorage.removeItem('walletData');
                }
                state.loaded = true;
                if (state.selected !== 'all' && !state.wallets.some(item => item.address === state.selected)) state.selected = 'all';
            } catch (error) {
                state.error = error.message; state.loaded = false;
                if (error.status === 401) {
                    for (const key of ['token', 'user', 'walletData', 'connectedWallet']) localStorage.removeItem(key);
                    sessionStorage.removeItem('cvSelectedWallet');
                    location.replace('login.html');
                }
            } finally {
                renderWallets(); document.dispatchEvent(new CustomEvent('cv:data', { detail: state })); pending = null;
            }
            return state;
        })();
        return pending;
    }
    function renderWallets() {
        if (!$('cvWalletList')) return;
        $('cvWalletList').innerHTML = `<button class="cv-wallet-row ${state.selected === 'all' ? 'active' : ''}" data-wallet="all">${icon('credit-card')}<span><strong>All wallets</strong></span><em>${state.loaded ? state.wallets.length : '--'}</em></button>` + state.wallets.map(wallet => `<button class="cv-wallet-row ${state.selected === wallet.address ? 'active' : ''}" data-wallet="${escape(wallet.address)}"><img src="assets/crypto/btc.svg" alt=""><span><strong>${escape(wallet.label)}</strong><small>${escape(short(wallet.address))}</small></span></button>`).join('');
        $('cvWalletList').querySelectorAll('[data-wallet]').forEach(button => button.addEventListener('click', () => { select(button.dataset.wallet); if (!location.pathname.endsWith('index.html') && !location.pathname.endsWith('/')) location.href = 'index.html'; closeMenu(); }));
        if ($('cvMobileWallet')) {
            $('cvMobileWallet').replaceChildren();
            for (const item of [{ address: 'all', label: 'All wallets' }, ...state.wallets]) { const option = document.createElement('option'); option.value = item.address; option.textContent = item.label; $('cvMobileWallet').append(option); }
            $('cvMobileWallet').value = state.selected;
        }
        $('cvSyncLabel').textContent = state.error ? 'Connection unavailable' : state.loaded ? `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Connecting...';
        const initial = state.user?.username?.charAt(0)?.toUpperCase() || 'U';
        $('cvProfile').textContent = initial; $('cvProfile').title = state.user?.username || 'Account';
        if ($('cvLegacyError')) { const message = state.error || state.walletError; $('cvLegacyError').hidden = !message; $('cvLegacyErrorText').textContent = message || ''; }
        icons();
    }
    function closeMenu() {
        if (!$('cvSidebar')?.classList.contains('open')) return;
        $('cvSidebar').classList.remove('open'); $('cvSidebar').removeAttribute('role'); $('cvSidebar').removeAttribute('aria-modal'); $('cvMenuShade').hidden = true;
        document.querySelectorAll('.cv-mobile-menu').forEach(button => button.setAttribute('aria-expanded','false'));
        document.body.style.overflow = ''; menuOrigin?.focus();
    }
    function showMenu() {
        menuOrigin = document.activeElement; $('cvSidebar')?.classList.add('open'); $('cvSidebar').setAttribute('role','dialog'); $('cvSidebar').setAttribute('aria-modal','true'); $('cvSidebar').setAttribute('aria-label','Account navigation'); $('cvMenuShade').hidden = false;
        document.querySelectorAll('.cv-mobile-menu').forEach(button => button.setAttribute('aria-expanded','true'));
        document.body.style.overflow = 'hidden'; $('cvSidebar').querySelector('a')?.focus();
    }
    function logout() {
        if (!confirm('Sign out of CoinVault?')) return;
        for (const key of ['token', 'user', 'walletData', 'connectedWallet']) localStorage.removeItem(key);
        sessionStorage.clear(); location.href = 'login.html';
    }
    async function copy(value) {
        if (!value) return toast('No wallet address is available.');
        try { await navigator.clipboard.writeText(value); toast('Address copied.'); } catch { toast('Unable to copy. Please select the address to copy it.'); }
    }
    function showConnect() {
        closeMenu();
        if (!$('cvConnectDialog')) {
            const dialog = document.createElement('dialog'); dialog.id = 'cvConnectDialog'; dialog.className = 'cv-dialog';
            dialog.innerHTML = `<div class="cv-dialog-heading"><h2>Connect a Bitcoin wallet</h2><button class="cv-icon" type="button" title="Close" aria-label="Close">${icon('x')}</button></div><p>Connect using your Bitcoin wallet address. Never enter a seed phrase or private key.</p><form id="cvConnectForm"><label for="cvConnectAddress">Bitcoin address</label><input id="cvConnectAddress" name="address" required autocomplete="off" spellcheck="false" placeholder="bc1..." pattern="(bc1|[13])[a-zA-Z0-9]{20,90}"><p class="cv-dialog-error" role="alert" id="cvConnectError"></p><button class="cv-button primary" type="submit">${icon('plus')}Connect wallet</button></form>`;
            document.body.append(dialog); dialog.querySelector('.cv-icon').addEventListener('click', () => dialog.close());
            $('cvConnectForm').addEventListener('submit', async event => {
                event.preventDefault(); const button = event.currentTarget.querySelector('[type=submit]'); button.disabled = true; $('cvConnectError').textContent = '';
                try { await request('/wallet/connect-bluewallet', { method: 'POST', body: { address: $('cvConnectAddress').value.trim() } }); await load(true); dialog.close(); toast('Wallet connected.'); }
                catch (error) { $('cvConnectError').textContent = error.message; } finally { button.disabled = false; }
            });
        }
        $('cvConnectDialog').showModal(); icons();
    }
    function showProfile() {
        closeMenu();
        if (!$('cvProfileDialog')) {
            const dialog = document.createElement('dialog'); dialog.id = 'cvProfileDialog'; dialog.className = 'cv-dialog';
            dialog.innerHTML = `<div class="cv-dialog-heading"><h2>Your account</h2><button class="cv-icon" type="button" title="Close" aria-label="Close">${icon('x')}</button></div><dl><dt>Name</dt><dd id="cvAccountName"></dd><dt>Email</dt><dd id="cvAccountEmail"></dd><dt>Email status</dt><dd id="cvAccountVerified"></dd></dl><button class="cv-button danger" id="cvSignOut">${icon('log-out')}Sign out</button>`;
            document.body.append(dialog); dialog.querySelector('.cv-icon').onclick = () => dialog.close(); $('cvSignOut').onclick = logout;
        }
        $('cvAccountName').textContent = state.user?.username || 'Unavailable'; $('cvAccountEmail').textContent = state.user?.email || 'Unavailable'; $('cvAccountVerified').textContent = state.user ? state.user.emailVerified ? 'Verified' : 'Not verified' : 'Unavailable'; $('cvProfileDialog').showModal(); icons();
    }
    function mount() {
        document.body.classList.add('cv-account');
        if (new URLSearchParams(location.search).get('panel') === '1' && location.pathname.endsWith('withdraw.html')) return;
        const page = location.pathname.split('/').pop() || 'index.html';
        const nav = [['index.html', 'credit-card', 'Wallet'], ['market.html', 'bar-chart-2', 'Market'], ['swap.html', 'repeat', 'Swap'], ['nfts.html', 'image', 'NFTs']];
        const shell = document.createElement('div'); shell.id = 'cvAccountShell';
        shell.innerHTML = `<aside class="cv-rail"><a href="index.html" title="CoinVault"><img class="cv-logo" src="favicon-96x96.png" alt="CoinVault"></a><nav aria-label="Account navigation">${nav.map(([href, glyph, label]) => `<a class="cv-icon ${page === href || href === 'index.html' && ['withdraw.html', 'receive.html', 'send.html', 'buy.html', 'sell.html'].includes(page) ? 'active' : ''}" href="${href}" title="${label}" aria-label="${label}">${icon(glyph)}</a>`).join('')}</nav><div class="cv-rail-bottom"><button class="cv-icon" id="cvRefresh" aria-label="Refresh account" title="Refresh account">${icon('refresh-cw')}</button><button class="cv-icon cv-avatar" id="cvProfile" aria-label="Your account" title="Your account">U</button></div></aside><div class="cv-menu-shade" id="cvMenuShade" hidden></div><aside class="cv-sidebar" id="cvSidebar"><a href="index.html" class="cv-brand"><img src="favicon-96x96.png" class="cv-logo" alt="">CoinVault</a><div class="cv-sidebar-heading"><span>Wallets</span><button class="cv-icon" id="cvConnect" aria-label="Connect wallet" title="Connect wallet">${icon('plus')}</button></div><div class="cv-wallets" id="cvWalletList"></div><div class="cv-sidebar-section"><p>Activity</p><a class="cv-wallet-row" href="index.html#activity">${icon('clock')}<span>All transactions</span></a></div><div class="cv-sidebar-section cv-mobile-nav">${nav.map(([href, glyph, label]) => `<a class="cv-wallet-row" href="${href}">${icon(glyph)}<span>${label}</span></a>`).join('')}<button class="cv-wallet-row" id="cvMobileProfile">${icon('user')}<span>Your account</span></button></div><div class="cv-sync">${icon('refresh-cw')}<span id="cvSyncLabel">Connecting...</span></div></aside>`;
        document.body.prepend(shell); $('cvConnect').onclick = showConnect; $('cvProfile').onclick = showProfile; $('cvMobileProfile').onclick = showProfile; $('cvRefresh').onclick = () => { loadQuotes(true); load(true); }; $('cvMenuShade').onclick = closeMenu;
        document.querySelectorAll('[data-cv-menu]').forEach(button => button.addEventListener('click', showMenu));
        if (!$('cvDashboard')) {
            const main = document.querySelector('body>main'); main?.classList.add('cv-legacy-main');
            if (main) {
                const bar = document.createElement('div'); bar.className = 'cv-topbar'; bar.innerHTML = `<a class="cv-mobile-brand" href="index.html"><img src="favicon-96x96.png" class="cv-logo" alt="">CoinVault</a><div class="cv-breadcrumb">Wallets <span>/ ${escape(document.title.split(' - ')[0])}</span></div><button class="cv-icon cv-mobile-menu" aria-label="Open navigation" title="Open navigation">${icon('menu')}</button>`; main.prepend(bar); bar.querySelector('button').onclick = showMenu;
                const banner = document.createElement('div'); banner.id = 'cvLegacyError'; banner.className = 'cv-inline-error'; banner.hidden = true; banner.setAttribute('role','alert'); banner.innerHTML = '<span id="cvLegacyErrorText"></span><button class="cv-link">Retry</button>'; bar.after(banner); banner.querySelector('button').onclick = () => { loadQuotes(true); load(true); };
            }
        }
        renderWallets(); icons(); load(); loadQuotes();
        window.addEventListener('storage', event => {
            if (event.key === 'token') location.replace(event.newValue ? 'index.html' : 'login.html');
            if (event.key === 'lastBalanceUpdate' && event.newValue) load(true);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeMenu();
            if (event.key === 'Tab' && $('cvSidebar').classList.contains('open')) {
                const controls = [...$('cvSidebar').querySelectorAll('a[href],button:not([disabled])')].filter(node => node.getClientRects().length);
                if (!controls.length) return;
                if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
                if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
            }
        });
    }
    window.CVAccount = { state, load, loadQuotes, request, currentWallets, select, money, short, escape, icon, icons, toast, copy, showConnect, showProfile, showMenu };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
