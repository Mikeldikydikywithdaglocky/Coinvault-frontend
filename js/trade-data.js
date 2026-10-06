(() => {
    'use strict';
    const endpoint = 'https://api.exchange.coinbase.com/products';
    const intervals = [60, 300, 900, 3600, 21600, 86400];
    const state = { products: [], product: null, requested: 'BTC', interval: 900, candles: [], ticker: null, tickerAt: 0, tickerSource: null, bids: [], asks: [], trades: [], bookAt: 0, bookSource: null, loading: false, errors: {}, connected: false, catalogError: false };
    let generation = 0, historyVersion = 0, controller, historyController, socket, reconnectTimer, pollTimer, paintTimer, refreshPending, stopped = false, reconnectDelay = 1000, lastTickerTime = 0, lastTradeId = null, historyAcceptedAt = 0;
    let bids = new Map(), asks = new Map();
    const positive = value => Number.isFinite(Number(value)) && Number(value) > 0;
    const validId = id => /^[A-Z0-9]{1,20}-USD$/.test(String(id));
    const fresh = () => positive(state.ticker?.price) && Date.now() - state.tickerAt < 30000;
    function notify(kind = 'market', immediate = false) {
        if (immediate) return document.dispatchEvent(new CustomEvent('ct:data', { detail: { kind } }));
        if (paintTimer) return;
        paintTimer = setTimeout(() => { paintTimer = null; notify('market', true); }, 250);
    }
    async function read(path, signal) {
        const timeout = new AbortController();
        const abort = () => timeout.abort();
        if (signal?.aborted) timeout.abort();
        else signal?.addEventListener('abort', abort, { once: true });
        const timer = setTimeout(abort, 12000);
        try {
            const response = await fetch(endpoint + path, { credentials: 'omit', signal: timeout.signal });
            if (!response.ok) throw new Error('Market data unavailable');
            return await response.json();
        } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
    }
    function normalizeProduct(item) {
        if (!validId(item?.id) || item.quote_currency !== 'USD' || item.status !== 'online' || item.trading_disabled) return null;
        return { id: item.id, symbol: item.id.slice(0, -4), name: item.display_name || item.base_currency, increment: positive(item.quote_increment) ? Number(item.quote_increment) : .01, baseIncrement: positive(item.base_increment) ? String(item.base_increment) : '0.00000001' };
    }
    function takeBook(data, source) {
        if (!Array.isArray(data.bids) || !Array.isArray(data.asks)) return;
        bids = new Map(data.bids.filter(row => positive(row[0]) && positive(row[1])).map(row => [String(Number(row[0])), Number(row[1])]));
        asks = new Map(data.asks.filter(row => positive(row[0]) && positive(row[1])).map(row => [String(Number(row[0])), Number(row[1])]));
        publishBook(source);
    }
    function publishBook(source) {
        state.bids = [...bids].map(([price, size]) => ({ price: Number(price), size })).sort((a, b) => b.price - a.price).slice(0, 7);
        state.asks = [...asks].map(([price, size]) => ({ price: Number(price), size })).sort((a, b) => a.price - b.price).slice(0, 7);
        state.bookAt = Date.now(); state.bookSource = source;
        delete state.errors.book; notify();
    }
    function normalizeTrade(item) {
        const time = Date.parse(item.time), price = Number(item.price), size = Number(item.size ?? item.last_size);
        if (!Number.isFinite(time) || !positive(price) || !positive(size)) return null;
        // Coinbase reports the maker's side; the displayed color is the taker's side.
        return { id: String(item.trade_id), time, price, size, side: item.side === 'sell' ? 'buy' : 'sell' };
    }
    function applyTicker(data, source) {
        if (!positive(data.price)) return;
        const previous = state.ticker || {};
        state.ticker = { price: Number(data.price), open: positive(data.open_24h) ? Number(data.open_24h) : previous.open,
            high: positive(data.high_24h) ? Number(data.high_24h) : previous.high, low: positive(data.low_24h) ? Number(data.low_24h) : previous.low,
            volume: Number.isFinite(Number(data.volume_24h)) ? Number(data.volume_24h) : previous.volume,
            bid: positive(data.best_bid) ? Number(data.best_bid) : previous.bid, ask: positive(data.best_ask) ? Number(data.best_ask) : previous.ask };
        state.tickerAt = Date.now(); state.tickerSource = source; delete state.errors.ticker; notify();
    }
    function updateCandle(data, time, newTrade) {
        if (!state.candles.length || state.loading) return;
        const bucket = Math.floor(time / 1000 / state.interval) * state.interval;
        const last = state.candles.at(-1), price = Number(data.price);
        if (bucket < last.time) return;
        const volume = newTrade && time > historyAcceptedAt && positive(data.last_size) ? Number(data.last_size) : 0;
        if (bucket === last.time) { last.high = Math.max(last.high, price); last.low = Math.min(last.low, price); last.close = price; last.volume += volume; }
        else state.candles.push({ time: bucket, open: price, high: price, low: price, close: price, volume });
        state.candles = state.candles.slice(-300);
    }
    function loadCandles(interval = state.interval) {
        if (!state.product || !intervals.includes(Number(interval))) return;
        state.interval = Number(interval); state.loading = true; state.candles = [];
        delete state.errors.candles;
        const version = ++historyVersion, current = generation, product = state.product.id;
        historyController?.abort(); historyController = new AbortController();
        const signal = historyController.signal;
        notify('history', true);
        const end = Date.now(), start = end - state.interval * 240000;
        const query = new URLSearchParams({ granularity: String(state.interval), start: new Date(start).toISOString(), end: new Date(end).toISOString() });
        return read(`/${encodeURIComponent(product)}/candles?${query}`, signal).then(data => {
            if (current !== generation || version !== historyVersion || signal.aborted) return;
            if (!Array.isArray(data)) throw new Error('Invalid candles');
            const candles = data.filter(row => Array.isArray(row) && row.length >= 6 && Number.isFinite(Number(row[0])) && row.slice(1, 5).every(positive)
                && Number(row[1]) <= Math.min(Number(row[3]), Number(row[4])) && Number(row[2]) >= Math.max(Number(row[3]), Number(row[4])) && Number(row[0]) <= end / 1000)
                .map(row => ({ time: Number(row[0]), low: Number(row[1]), high: Number(row[2]), open: Number(row[3]), close: Number(row[4]), volume: Math.max(0, Number(row[5]) || 0) }));
            state.candles = [...new Map(candles.map(candle => [candle.time, candle])).values()].sort((a, b) => a.time - b.time);
            if (state.candles.length < 2) throw new Error('Insufficient candles');
            historyAcceptedAt = Date.now();
        }).catch(() => {
            if (current === generation && version === historyVersion && !signal.aborted) { state.candles = []; state.errors.candles = 'Candles are temporarily unavailable.'; }
        }).finally(() => {
            if (current === generation && version === historyVersion && !signal.aborted) { state.loading = false; notify('history', true); }
        });
    }
    function refresh() {
        if (!state.product || stopped || document.hidden || refreshPending) return refreshPending;
        const current = generation, product = state.product.id, signal = controller.signal;
        const quoteFresh = state.tickerSource === 'stream' && Date.now() - state.tickerAt < 20000 && socket?.readyState === WebSocket.OPEN;
        const bookFresh = state.bookSource === 'stream' && Date.now() - state.bookAt < 20000 && socket?.readyState === WebSocket.OPEN;
        const jobs = [];
        if (!quoteFresh) {
            jobs.push(read(`/${product}/ticker`, signal).then(data => {
                if (current !== generation || state.tickerSource === 'stream' && Date.now() - state.tickerAt < 20000) return;
                if (!positive(data.price)) throw new Error('Invalid quote');
                applyTicker({ ...data, best_bid: data.bid, best_ask: data.ask }, 'rest');
            }).catch(() => { if (current === generation) state.errors.ticker = 'Price updates are temporarily unavailable.'; }));
            jobs.push(read(`/${product}/stats`, signal).then(data => {
                if (current !== generation || !positive(data.last) || state.tickerSource === 'stream' && Date.now() - state.tickerAt < 20000) return;
                const previous = state.ticker || {};
                state.ticker = { ...previous, open: Number(data.open), high: Number(data.high), low: Number(data.low), volume: Number(data.volume) };
                if (!positive(previous.price)) applyTicker({ price: data.last }, 'rest');
            }).catch(() => {}));
        }
        if (!bookFresh) jobs.push(read(`/${product}/book?level=2`, signal).then(data => {
            if (current === generation && !(state.bookSource === 'stream' && Date.now() - state.bookAt < 20000)) takeBook(data, 'rest');
        }).catch(() => { if (current === generation) state.errors.book = 'Market depth is temporarily unavailable.'; }));
        if (!quoteFresh) jobs.push(read(`/${product}/trades?limit=30`, signal).then(data => {
            if (current !== generation || !Array.isArray(data)) return;
            const trades = data.map(normalizeTrade).filter(Boolean);
            state.trades = [...new Map([...state.trades, ...trades].map(trade => [trade.id, trade])).values()].sort((a, b) => b.time - a.time).slice(0, 30);
            delete state.errors.trades;
        }).catch(() => { if (current === generation) state.errors.trades = 'Recent trades are temporarily unavailable.'; }));
        if (!jobs.length) return;
        const pending = Promise.allSettled(jobs).finally(() => { if (refreshPending === pending) refreshPending = null; if (current === generation) notify(); });
        refreshPending = pending;
        return pending;
    }
    function reconnect() {
        if (stopped || document.hidden || reconnectTimer || !state.product) return;
        reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    }
    function connect() {
        if (!state.product || stopped || document.hidden || socket && socket.readyState < WebSocket.CLOSING) return;
        let stream;
        try { stream = new WebSocket('wss://ws-feed.exchange.coinbase.com'); socket = stream; }
        catch { reconnect(); return; }
        const current = generation, product = state.product.id;
        stream.addEventListener('open', () => {
            if (socket !== stream || current !== generation) return;
            reconnectDelay = 1000; state.connected = true;
            stream.send(JSON.stringify({ type: 'subscribe', product_ids: [product], channels: ['ticker', 'level2_batch', 'heartbeat'] }));
            notify();
        });
        stream.addEventListener('message', event => {
            if (socket !== stream || current !== generation) return;
            let data; try { data = JSON.parse(event.data); } catch { return; }
            if (!data || data.product_id !== product) return;
            if (data.type === 'snapshot') takeBook(data, 'stream');
            else if (data.type === 'l2update' && Array.isArray(data.changes)) {
                for (const [side, price, size] of data.changes) {
                    if (!['buy', 'sell'].includes(side) || !positive(price) || !Number.isFinite(Number(size)) || Number(size) < 0) continue;
                    const levels = side === 'buy' ? bids : asks, key = String(Number(price));
                    if (Number(size) === 0) levels.delete(key); else levels.set(key, Number(size));
                }
                publishBook('stream');
            } else if (data.type === 'ticker' && positive(data.price)) {
                const time = Date.parse(data.time);
                if (!Number.isFinite(time) || time < lastTickerTime || time < Date.now() - 120000 || time > Date.now() + 60000) return;
                const newTrade = data.trade_id !== undefined && String(data.trade_id) !== lastTradeId;
                if (!newTrade && time === lastTickerTime) return;
                lastTickerTime = time;
                if (newTrade) lastTradeId = String(data.trade_id);
                applyTicker(data, 'stream'); updateCandle(data, time, newTrade);
                const trade = newTrade ? normalizeTrade(data) : null;
                if (trade) { state.trades = [trade, ...state.trades.filter(item => item.id !== trade.id)].slice(0, 30); delete state.errors.trades; }
            }
        });
        stream.addEventListener('close', () => {
            if (socket !== stream || current !== generation) return;
            socket = null; state.connected = false;
            notify(); reconnect(); refresh();
        });
        stream.addEventListener('error', () => stream.close());
    }
    function select(id) {
        if (!validId(id)) return;
        ++generation; controller?.abort(); historyController?.abort(); controller = new AbortController();
        clearTimeout(reconnectTimer); reconnectTimer = null;
        const old = socket; socket = null; old?.close();
        refreshPending = null; bids = new Map(); asks = new Map(); lastTickerTime = 0; lastTradeId = null;
        state.requested = id.slice(0, -4); state.product = state.products.find(product => product.id === id) || null;
        Object.assign(state, { candles: [], ticker: null, tickerAt: 0, tickerSource: null, bids: [], asks: [], trades: [], bookAt: 0, bookSource: null, loading: false, errors: {}, connected: false });
        if (!state.product) state.errors.market = state.catalogError ? 'Market data is temporarily unavailable.' : `${state.requested} / USD is not available from this market data source.`;
        notify('selection', true);
        if (state.product) { loadCandles(); refresh(); connect(); }
    }
    async function start(symbol = 'BTC') {
        stopped = false;
        state.requested = /^[A-Z0-9]{1,20}$/.test(symbol) ? symbol : 'BTC';
        try {
            const data = await read('');
            if (!Array.isArray(data)) throw new Error('Invalid markets');
            state.products = data.map(normalizeProduct).filter(Boolean).sort((a, b) => a.symbol.localeCompare(b.symbol));
            state.catalogError = false;
        } catch {
            state.catalogError = true;
            try { const data = await read('/' + state.requested + '-USD'); const product = normalizeProduct(data); state.products = product ? [product] : []; }
            catch { state.products = []; }
        }
        select(state.requested + '-USD');
        clearInterval(pollTimer);
        pollTimer = setInterval(() => { if (!document.hidden) { refresh(); notify(); } }, 15000);
    }
    function stop() {
        stopped = true; controller?.abort(); historyController?.abort(); clearInterval(pollTimer); clearTimeout(paintTimer); clearTimeout(reconnectTimer); paintTimer = reconnectTimer = null;
        const old = socket; socket = null; old?.close(); state.connected = false;
    }
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { clearTimeout(reconnectTimer); reconnectTimer = null; const old = socket; socket = null; old?.close(); state.connected = false; }
        else if (!stopped) { connect(); refresh(); notify(); }
    });
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', event => { if (event.persisted) start(state.requested); });
    window.CVTradeData = { state, start, select, loadCandles, refresh, stop, fresh };
})();
