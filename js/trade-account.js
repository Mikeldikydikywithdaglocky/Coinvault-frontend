(() => {
    'use strict';
    const A = window.CVAccount, D = window.Decimal.clone({ precision: 40 });
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    const hosts = local ? ['http://localhost:5051/api'] : ['https://api.coinvaultnet.com/api', 'https://coinvault-backend-production.up.railway.app/api'];
    const state = { account: null, loading: false, saving: false, error: null, waitingForBalance: false, unavailable: [] };
    let loading, timer, owner = null;
    const notify = () => document.dispatchEvent(new CustomEvent('ct:account'));
    async function request(path = '', method = 'GET', body) {
        for (let index = 0; index < hosts.length; index++) {
            try {
                const response = await fetch(hosts[index] + '/wallet/simulated-trading' + path, {
                    method, credentials: 'omit', signal: AbortSignal.timeout(20000),
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
                    body: body ? JSON.stringify(body) : undefined
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                    const message = response.status === 401 ? 'Please sign in again to use simulated trading.' :
                        [400, 409].includes(response.status) && typeof data.message === 'string' ? data.message : 'Simulated trading is temporarily unavailable. Please try again shortly.';
                    const error = new Error(message); error.status = response.status; throw error;
                }
                if (data.mode !== 'simulation' || data.account && data.account.mode !== 'simulation') throw new Error('Simulated trading is temporarily unavailable.');
                return data;
            } catch (error) {
                if (method === 'GET' && index < hosts.length - 1 && (!error.status || error.status >= 500)) continue;
                if (!error.status) error.message = 'Unable to confirm your trading request. Please try again.';
                throw error;
            }
        }
    }
    function startingBalance() {
        if (!A.state.loaded || A.state.error || A.state.walletError || !A.state.wallets.length) return null;
        if (A.state.wallets.some(wallet => wallet.unavailable || wallet.balance === null || !Number.isFinite(Number(wallet.balance)) || Number(wallet.balance) < 0)) return null;
        return A.state.wallets.reduce((total, wallet) => total.plus(String(wallet.balance)), new D(0)).toDecimalPlaces(2, D.ROUND_DOWN);
    }
    function startingHoldings() {
        const holdings = {};
        for (const wallet of A.state.wallets) {
            if (!wallet.assets?.length && Number(wallet.balance) > 0) return null;
            for (const asset of wallet.assets || []) {
                if (!/^[A-Z0-9]{1,20}$/.test(asset.symbol) || asset.balance === null || asset.balance === undefined) return null;
                const value = new D(String(asset.balance));
                if (!value.isFinite() || value.lt(0)) return null;
                holdings[asset.symbol] = new D(holdings[asset.symbol] || 0).plus(value).toDecimalPlaces(18, D.ROUND_DOWN).toFixed();
            }
        }
        return Object.values(holdings).some(value => new D(value).gt(0)) ? holdings : null;
    }
    function accept(result) {
        if (state.account && result.account && result.account.version < state.account.version) return;
        state.account = result.account; state.unavailable = result.unavailable || [];
        state.error = null; state.waitingForBalance = false;
    }
    async function load() {
        const userId = A.state.user?.id;
        if (owner !== userId) { owner = userId; state.account = null; }
        if (loading || state.saving || !A.state.loaded || !userId) return loading;
        state.loading = true; notify();
        loading = (async () => {
            try {
                const result = state.account?.openOrders?.length ? await request('/sync', 'POST') : await request();
                if (owner !== userId) return;
                if (result.account) accept(result);
                else {
                    const balance = startingBalance();
                    if (!balance || balance.lte(0)) { state.waitingForBalance = true; state.error = null; return; }
                    const holdings = startingHoldings();
                    if (!holdings) { state.waitingForBalance = true; state.error = null; return; }
                    const initialized = await request('', 'POST', { startingBalanceUsd: balance.toFixed(2), startingBalances: holdings });
                    if (owner === userId) accept(initialized);
                }
            } catch (error) { if (owner === userId) state.error = error.message; }
            finally { state.loading = false; loading = null; notify(); }
        })();
        return loading;
    }
    async function mutate(path, body) {
        if (state.saving) throw new Error('Please wait for your current request to finish.');
        const userId = owner;
        state.saving = true; notify();
        try {
            const result = await request(path, 'POST', body);
            if (owner !== userId || A.state.user?.id !== userId) throw new Error('Your account changed. Please reload the trading page.');
            accept(result); return result;
        }
        finally { state.saving = false; notify(); }
    }
    function start() {
        clearInterval(timer); load();
        timer = setInterval(() => { if (!document.hidden) load(); }, 10000);
    }
    document.addEventListener('cv:data', load);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
    document.addEventListener('DOMContentLoaded', start);
    window.addEventListener('pagehide', () => clearInterval(timer));
    window.addEventListener('pageshow', event => { if (event.persisted) start(); });
    window.CVTradingAccount = {
        state, load, available: currency => state.account?.balances?.[currency] || '0',
        place: order => mutate('/orders', order), cancel: id => mutate(`/orders/${encodeURIComponent(id)}/cancel`)
    };
})();
