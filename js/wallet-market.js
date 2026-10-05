(() => {
    'use strict';
    const A = window.CVAccount;
    const $ = id => document.getElementById(id);
    const endpoint = 'https://api.exchange.coinbase.com/products/';
    const products = { 'BTC-USD': 'BTC', 'ETH-USD': 'ETH', 'USDT-USD': 'USDT' };
    const assetQuotes = {}, streamTimes = {};
    const day = 86400000, candleSize = 900000;
    const state = { price: null, open: null, source: null, quotedAt: 0, streamAt: 0, restAt: 0, delayed: false, points: [], historyReady: false, historyLoading: false, historyAt: 0, selected: null };
    let chart, socket, reconnectTimer, pollTimer, paintTimer, reconnectDelay = 1000, lastPaint = 0, historyPending, statsPending, stopped = false, dragging = false;
    const positive = number => Number.isFinite(Number(number)) && Number(number) > 0;
    const privateView = () => document.body.classList.contains('cv-private');
    const streamFresh = () => state.source === 'stream' && Date.now() - state.streamAt < 20000 && socket?.readyState === WebSocket.OPEN;
    const assetStreamFresh = symbol => symbol === 'BTC' ? streamFresh() : assetQuotes[symbol]?.source === 'stream' && Date.now() - assetQuotes[symbol].quotedAt < 20000 && socket?.readyState === WebSocket.OPEN;
    const priceFor = asset => {
        const price = asset.symbol === 'BTC' ? state.price : assetQuotes[asset.symbol]?.price;
        return positive(price) ? price : positive(A.state.quotes[asset.symbol]) ? A.state.quotes[asset.symbol] : asset.price;
    };

    function valuation(btcPrice = state.price) {
        if (!A.state.loaded || A.state.error || A.state.walletError) return { total: null, btc: 0 };
        const wallets = A.currentWallets();
        let total = 0, btc = 0;
        for (const wallet of wallets) {
            if (wallet.unavailable || wallet.balance === null || !Number.isFinite(Number(wallet.balance))) return { total: null, btc: 0 };
            const base = Math.max(0, Number(wallet.balance));
            const assets = (wallet.assets || []).filter(asset => positive(asset.price) && Number.isFinite(Number(asset.balance)) && Number(asset.balance) >= 0);
            const reference = assets.reduce((sum, asset) => sum + Number(asset.balance) * Number(asset.price), 0);
            // Revalue only the recorded remaining exposure; never restore a deducted balance.
            const remaining = reference > 0 ? Math.min(1, base / reference) : 0;
            let marked = base;
            for (const asset of assets) {
                const units = Number(asset.balance) * remaining;
                const price = asset.symbol === 'BTC' && positive(btcPrice) ? btcPrice : priceFor(asset);
                if (positive(price)) marked += units * (Number(price) - Number(asset.price));
                if (asset.symbol === 'BTC') btc += units;
            }
            total += Math.max(0, marked);
        }
        return { total, btc };
    }

    function appendPrice(price) {
        const now = Date.now(), last = state.points.at(-1);
        const point = { time: now, price };
        if (last && Math.floor(last.time / 60000) === Math.floor(now / 60000) && last.time !== state.selected?.time) state.points[state.points.length - 1] = point;
        else state.points.push(point);
        state.points = state.points.filter(item => item.time >= now - day).slice(-1800);
    }

    function acceptPrice(price, open, source) {
        if (!positive(price)) return;
        state.price = Number(price);
        if (positive(open)) state.open = Number(open);
        state.source = source;
        state.delayed = false;
        state.quotedAt = Date.now();
        if (source === 'stream') state.streamAt = Date.now();
        if (source === 'rest') state.restAt = Date.now();
        appendPrice(state.price);
        schedulePaint();
    }

    function acceptAssetPrice(symbol, price, open, source) {
        if (!positive(price)) return;
        if (symbol === 'BTC') return acceptPrice(price, open, source);
        assetQuotes[symbol] = { price: Number(price), quotedAt: Date.now(), source };
        schedulePaint();
    }

    function schedulePaint() {
        if (stopped || paintTimer) return;
        const wait = Math.max(0, 1000 - (Date.now() - lastPaint));
        paintTimer = setTimeout(() => {
            paintTimer = null; lastPaint = Date.now(); render();
            document.dispatchEvent(new CustomEvent('cv:market'));
        }, wait);
    }

    async function read(path, symbol = 'BTC') {
        const response = await fetch(endpoint + symbol + '-USD/' + path, { signal: AbortSignal.timeout(10000), credentials: 'omit' });
        if (!response.ok) throw new Error('Market information unavailable');
        return response.json();
    }

    function refreshStats() {
        if (statsPending || stopped || document.hidden) return statsPending;
        const symbols = Object.values(products).filter(symbol => !assetStreamFresh(symbol));
        if (!symbols.length) return;
        statsPending = Promise.all(symbols.map(async symbol => {
            try {
                const data = await read('stats', symbol);
                if (!positive(data.last)) throw new Error('Invalid market price');
                if (!assetStreamFresh(symbol)) acceptAssetPrice(symbol, data.last, data.open, 'rest');
            } catch { if (symbol === 'BTC') state.delayed = !streamFresh(); }
        })).finally(() => { statsPending = null; render(); });
        return statsPending;
    }

    function loadHistory(force = false) {
        if (historyPending || (!force && state.historyReady && Date.now() - state.historyAt < 300000)) return historyPending;
        state.historyLoading = true; render();
        historyPending = (async () => {
            try {
                const now = Date.now();
                const query = new URLSearchParams({ granularity: '900', start: new Date(now - day - candleSize).toISOString(), end: new Date(now).toISOString() });
                const data = await read('candles?' + query);
                if (!Array.isArray(data)) throw new Error('Invalid history');
                const candles = data.filter(row => Array.isArray(row) && row.length >= 5 && Number.isFinite(Number(row[0])) && positive(row[4]))
                    .map(row => ({ time: Number(row[0]) * 1000 + candleSize, price: Number(row[4]) }))
                    .filter(point => point.time >= now - day && point.time <= now).sort((left, right) => left.time - right.time);
                if (candles.length < 2) throw new Error('Insufficient history');
                const lastCandle = candles.at(-1).time;
                const recent = state.points.filter(point => point.time > lastCandle);
                state.points = [...new Map([...candles, ...recent].map(point => [point.time, point])).values()].sort((left, right) => left.time - right.time);
                state.historyReady = true; state.historyAt = Date.now();
            } catch { /* Leave unavailable history empty instead of generating a curve. */ }
            finally { state.historyLoading = false; historyPending = null; render(); }
        })();
        return historyPending;
    }

    function connectStream() {
        if (stopped || document.hidden || socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(socket.readyState)) return;
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        let stream;
        try { stream = new WebSocket('wss://ws-feed.exchange.coinbase.com'); socket = stream; }
        catch { scheduleReconnect(); return; }
        stream.addEventListener('open', () => {
            if (socket !== stream) return;
            reconnectDelay = 1000;
            stream.send(JSON.stringify({ type: 'subscribe', product_ids: Object.keys(products), channels: ['ticker', 'heartbeat'] }));
        });
        stream.addEventListener('message', event => {
            if (socket !== stream) return;
            let data;
            try { data = JSON.parse(event.data); } catch { return; }
            const symbol = Object.hasOwn(products, data.product_id) ? products[data.product_id] : null;
            if (data.type !== 'ticker' || !symbol || !positive(data.price)) return;
            const time = Date.parse(data.time);
            if (!Number.isFinite(time) || time < (streamTimes[symbol] || 0) || time > Date.now() + 60000 || time < Date.now() - 120000) return;
            streamTimes[symbol] = time;
            acceptAssetPrice(symbol, data.price, data.open_24h, 'stream');
        });
        stream.addEventListener('close', () => { if (socket !== stream) return; socket = null; render(); scheduleReconnect(); refreshStats(); });
        stream.addEventListener('error', () => { stream.close(); });
    }

    function scheduleReconnect() {
        if (stopped || document.hidden || reconnectTimer) return;
        reconnectTimer = setTimeout(() => { reconnectTimer = null; connectStream(); }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    }

    const timeLabel = time => new Date(time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const signed = number => `${number >= 0 ? '+' : '-'}${A.money(Math.abs(number))}`;
    function message(text, retry = false) {
        $('cvHistoryMessage').hidden = !text;
        $('cvHistoryMessageText').textContent = text || '';
        $('cvHistoryRetry').hidden = !retry;
        $('cvBalanceChart').hidden = !!text;
    }

    function nearest(time) {
        let index = 0;
        for (let i = 1; i < state.points.length; i++) if (Math.abs(state.points[i].time - time) < Math.abs(state.points[index].time - time)) index = i;
        return index;
    }

    const glow = {
        id: 'coinvault-glow',
        beforeDatasetDraw(instance, args) {
            const ctx = instance.ctx;
            ctx.save(); ctx.shadowBlur = 0;
            if (args.index !== 1) return;
            // Preserve the full curve geometry, but light only the explored prefix.
            if (state.selected) {
                const point = instance.getDatasetMeta(1).data[nearest(state.selected.time)], area = instance.chartArea;
                if (point) { ctx.beginPath(); ctx.rect(area.left - 14, area.top - 14, Math.max(0, point.x - area.left + 14), area.bottom - area.top + 28); ctx.clip(); }
            }
            ctx.shadowBlur = 10; ctx.shadowColor = instance.data.datasets[1].borderColor;
        },
        afterDatasetDraw(instance) { instance.ctx.restore(); },
        afterDatasetsDraw(instance) {
            const index = state.selected ? nearest(state.selected.time) : state.points.length - 1;
            const point = instance.getDatasetMeta(1).data[index];
            if (!point) return;
            const ctx = instance.ctx, area = instance.chartArea, color = instance.data.datasets[1].borderColor;
            ctx.save();
            if (state.selected) {
                ctx.strokeStyle = color + '99'; ctx.shadowBlur = 5; ctx.shadowColor = color; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
                ctx.beginPath(); ctx.moveTo(point.x, area.top); ctx.lineTo(point.x, area.bottom); ctx.stroke();
            }
            ctx.setLineDash([]); ctx.shadowBlur = 14; ctx.shadowColor = color; ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(point.x, point.y, state.selected ? 4 : 3, 0, Math.PI * 2); ctx.fill();
            if ($('cvBalanceChart').matches(':focus-visible')) {
                ctx.strokeStyle = color; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(point.x, point.y, 7, 0, Math.PI * 2); ctx.stroke();
            }
            ctx.restore();
        }
    };

    function renderChart() {
        if ($('cvBalanceHistory').hidden) return;
        if (privateView()) { message('Balances hidden'); return; }
        const live = valuation();
        if (live.total === null) { message('Balance information unavailable'); return; }
        if (!live.btc) { message('No Bitcoin balance to chart'); return; }
        if (!state.historyReady || state.points.length < 2) { message(state.historyLoading ? 'Loading price history...' : 'Price history is temporarily unavailable', !state.historyLoading); return; }
        if (!window.Chart) { message('Chart is temporarily unavailable'); return; }
        message(null);
        const dataset = state.points.map(point => ({ x: point.time, y: valuation(point.price).total }));
        const values = dataset.map(point => point.y), low = Math.min(...values), high = Math.max(...values), padding = Math.max((high - low) * .15, Math.abs(high) * .0005, .01);
        const color = positive(state.open) && state.price < state.open ? '#f87171' : '#70e0cf';
        if (!chart) chart = new Chart($('cvBalanceChart'), {
            type: 'line',
            data: { datasets: [
                { data: dataset, borderColor: color + '4a', borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, fill: false, tension: .25, cubicInterpolationMode: 'monotone', order: 1 },
                { data: dataset, borderColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 0, fill: false, tension: .25, cubicInterpolationMode: 'monotone', order: 0 }
            ] },
            plugins: [glow],
            options: {
                responsive: true, maintainAspectRatio: false, animation: false, parsing: false, normalized: true, events: [],
                layout: { padding: { top: 14, right: 12, bottom: 12, left: 12 } },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { type: 'linear', display: false, min: Date.now() - day, max: Date.now() }, y: { display: false, min: Math.max(0, low - padding), max: high + padding } }
            }
        });
        else {
            chart.data.datasets[0].data = dataset;
            chart.data.datasets[0].borderColor = color + '4a';
            chart.data.datasets[1].data = dataset;
            chart.data.datasets[1].borderColor = color;
            chart.options.scales.x.min = Date.now() - day; chart.options.scales.x.max = Date.now();
            chart.options.scales.y.min = Math.max(0, low - padding); chart.options.scales.y.max = high + padding;
            chart.update('none');
        }
        $('cvHistoryStart').textContent = timeLabel(state.points[0].time);
        const index = state.selected ? nearest(state.selected.time) : state.points.length - 1;
        const canvas = $('cvBalanceChart');
        canvas.setAttribute('aria-valuemax', String(state.points.length - 1));
        canvas.setAttribute('aria-valuenow', String(index));
        canvas.setAttribute('aria-valuetext', `${state.selected ? timeLabel(state.selected.time) : 'Live'}: ${A.money(valuation(state.selected?.price).total)}`);
    }

    function render() {
        if (!$('cvTotalBalance')) return;
        const price = state.selected?.price ?? state.price;
        $('cvTotalBalance').textContent = A.money(valuation(price).total);
        $('cvTotalLabel').textContent = state.selected ? 'Estimated value at selected time' : 'Total value';
        $('cvBtcPrice').textContent = positive(price) ? `${A.money(price)} USD` : 'BTC price unavailable';
        const baseline = state.selected?.open ?? state.open;
        const change = positive(price) && positive(baseline) ? price - baseline : null;
        const movement = $('cvBtcMovement');
        movement.classList.toggle('is-positive', change > 0);
        movement.classList.toggle('is-negative', change < 0);
        $('cvBtcChangeAmount').textContent = change === null ? '--' : signed(change);
        $('cvBtcChangePercent').textContent = change === null ? '(--)' : `(${change >= 0 ? '+' : '-'}${Math.abs(change / baseline * 100).toFixed(2)}%)`;
        const mode = state.selected ? 'historical' : streamFresh() ? 'live' : !positive(state.price) ? 'unavailable' : state.delayed || Date.now() - state.quotedAt > 30000 ? 'delayed' : 'updated';
        $('cvBtcPrice').dataset.marketMode = mode;
        $('cvBtcPrice').title = mode === 'delayed' ? 'Last available Bitcoin price; updates temporarily delayed' : state.selected ? 'Bitcoin price at selected time' : 'Bitcoin market price';
        $('cvHistoryTime').textContent = state.selected ? timeLabel(state.selected.time) : positive(state.price) ? new Date(state.quotedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
        renderChart();
    }

    function selectPoint(index, announce = false) {
        if (privateView() || !state.historyReady || !state.points[index]) return;
        state.selected = { ...state.points[index], open: state.open };
        render();
        if (announce) $('cvChartAnnouncement').textContent = `${timeLabel(state.selected.time)}, estimated value ${A.money(valuation(state.selected.price).total)}`;
    }

    function returnLive() { state.selected = null; render(); }

    function init() {
        if (!$('cvBalanceHistory')) return;
        $('cvToggleHistory').addEventListener('click', () => {
            const opening = $('cvBalanceHistory').hidden;
            $('cvBalanceHistory').hidden = !opening;
            $('cvToggleHistory').setAttribute('aria-expanded', String(opening));
            $('cvToggleHistory').setAttribute('aria-label', opening ? 'Hide balance chart' : 'Show balance chart');
            $('cvToggleHistory').title = opening ? 'Hide balance chart' : 'Show balance chart';
            if (opening) { loadHistory(); render(); chart?.resize(); }
            else returnLive();
        });
        $('cvHistoryLive').addEventListener('click', returnLive);
        $('cvHistoryRetry').addEventListener('click', () => { refreshStats(); loadHistory(true); });
        const canvas = $('cvBalanceChart');
        const inspect = event => {
            if (!chart || privateView() || canvas.hidden) return;
            const position = Chart.helpers.getRelativePosition(event, chart);
            selectPoint(nearest(chart.scales.x.getValueForPixel(position.x)));
        };
        canvas.addEventListener('pointerdown', event => { dragging = true; canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true }); inspect(event); });
        canvas.addEventListener('pointermove', event => { if (dragging || event.pointerType === 'mouse') inspect(event); });
        canvas.addEventListener('pointerup', () => { dragging = false; });
        canvas.addEventListener('pointercancel', () => { dragging = false; returnLive(); });
        canvas.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse' && !dragging && !canvas.matches(':focus-visible')) returnLive(); });
        canvas.addEventListener('keydown', event => {
            const current = state.selected ? nearest(state.selected.time) : state.points.length - 1;
            const choices = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: state.points.length - 1 };
            if (event.key === 'Escape' || event.key === 'Enter') { event.preventDefault(); returnLive(); }
            else if (Object.hasOwn(choices, event.key)) { event.preventDefault(); selectPoint(Math.max(0, Math.min(state.points.length - 1, choices[event.key])), true); }
        });
        document.addEventListener('cv:data', () => { state.selected = null; render(); });
        document.addEventListener('cv:walletchange', () => { state.selected = null; render(); });
        document.addEventListener('cv:privacy', () => { if (privateView()) state.selected = null; render(); });
        document.addEventListener('cv:quotes', () => {
            if (!streamFresh() && Date.now() - state.restAt > 15000 && positive(A.state.quotes.BTC)) acceptPrice(A.state.quotes.BTC, null, 'quote');
            else if (!streamFresh() && state.source === 'quote' && !positive(A.state.quotes.BTC)) state.delayed = true;
            for (const symbol of ['ETH', 'USDT']) {
                if (!assetStreamFresh(symbol) && (!assetQuotes[symbol] || Date.now() - assetQuotes[symbol].quotedAt > 15000) && positive(A.state.quotes[symbol])) acceptAssetPrice(symbol, A.state.quotes[symbol], null, 'quote');
            }
            render();
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { clearTimeout(reconnectTimer); reconnectTimer = null; socket?.close(); }
            else { connectStream(); refreshStats(); if (!$('cvBalanceHistory').hidden) loadHistory(); }
        });
        const start = () => {
            stopped = false; connectStream(); refreshStats();
            clearInterval(pollTimer);
            pollTimer = setInterval(() => {
                if (document.hidden) return;
                refreshStats(); render();
                if (!$('cvBalanceHistory').hidden) loadHistory();
            }, 15000);
        };
        window.addEventListener('pagehide', () => { stopped = true; clearInterval(pollTimer); clearTimeout(reconnectTimer); clearTimeout(paintTimer); reconnectTimer = paintTimer = null; socket?.close(); });
        window.addEventListener('pageshow', event => { if (event.persisted) start(); });
        start(); render();
    }
    window.CVWalletMarket = { valuation, priceFor, render };
    document.addEventListener('DOMContentLoaded', init);
})();
