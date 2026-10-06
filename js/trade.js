(() => {
    'use strict';
    const A = window.CVAccount, M = window.CVTradeData, T = window.CVTradingAccount, $ = id => document.getElementById(id);
    const known = { BTC: 'Bitcoin', ETH: 'Ethereum', USDT: 'Tether', SOL: 'Solana', XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', BNB: 'BNB' };
    const DecimalNumber = window.Decimal?.clone({ precision: 48, rounding: 4 });
    let chart, candles, volume, side = 'buy', type = 'market', inputSource = 'quantity', chartKey = '', activeCandle, expandedOrigin, ordersView = 'open', pendingOrder;
    const number = (value, digits = 2) => Number.isFinite(Number(value)) && value !== null && value !== undefined ? Number(value).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '--';
    function digits() { const step = M.state.product?.increment || .01; return Math.min(12, Math.max(2, DecimalNumber ? new DecimalNumber(step).decimalPlaces() : Math.round(-Math.log10(step)))); }
    const price = value => number(value, digits());
    const size = value => number(value, Number(value) > 0 && Number(value) < .0001 ? 8 : 4);
    const money = value => Number.isFinite(Number(value)) && value !== null ? '$' + price(value) : '--';
    const usd = value => {
        const n = new DecimalNumber(value);
        return '$' + n.toNumber().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: n.gt(0) && n.lt('.01') ? 18 : 2 });
    };
    const feeFor = value => value.mul(T.state.account?.feeRate || '0.001').toDecimalPlaces(18, DecimalNumber.ROUND_DOWN);
    const receiptRows = entries => entries.map(([label, value], index) => `<div${index === entries.length - 1 ? ' class="ct-receipt-total"' : ''}><dt>${A.escape(label)}</dt><dd>${A.escape(value)}</dd></div>`).join('');
    function showReceipt(order) {
        const filled = order.status === 'filled', open = order.status === 'open', symbol = order.productId.slice(0, -4);
        $('ctReceiptTitle').textContent = filled ? 'Spot order filled' : open ? 'Simulated order placed' : 'Simulated order cancelled';
        $('ctReceiptIcon').innerHTML = A.icon(filled ? 'check' : open ? 'clock' : 'x');
        $('ctReceiptAmount').textContent = `${order.side === 'buy' ? 'Buy' : 'Sell'} ${order.quantity} ${symbol}`;
        $('ctReceiptMarket').textContent = `${symbol} / USD`;
        const rows = [['Status', filled ? 'Filled' : open ? 'Open' : 'Cancelled'], ['Order ID', order.id], ['Order type', order.type === 'market' ? 'Market' : 'Limit'], ['Created (UTC)', new Date(order.createdAt).toLocaleString('en-GB', { timeZone: 'UTC' })]];
        if (filled) {
            rows.push(['Fill price', usd(order.fillPrice)], ['Order value', usd(order.valueUsd)], ['Fee (' + new DecimalNumber(order.feeRate || 0).mul(100).toFixed(2) + '%)', usd(order.feeUsd || 0)], [order.side === 'buy' ? 'Total deducted' : 'Net proceeds', usd(order.totalUsd || order.valueUsd)]);
        } else {
            rows.push(['Limit price', usd(order.limitPrice)], ['Fee charged', '$0.00'], ['Reserved funds', order.reservedCurrency === 'USD' ? usd(order.reservedAmount) : `${order.reservedAmount} ${symbol}`]);
        }
        $('ctReceiptDetails').innerHTML = receiptRows(rows);
        $('ctReceiptNote').textContent = open ? 'Saved in Open orders. Fees apply only when filled. Limit orders are checked while this page is open.' : 'Saved in Order history.';
        $('ctReceiptViewOrders').textContent = open ? 'View open orders' : 'View order history';
        $('ctReceiptViewOrders').onclick = () => {
            $('ctReceiptDialog').close();
            (open ? $('ctOpenOrdersTab') : $('ctOrderHistoryTab')).click();
            if (matchMedia('(max-width:700px)').matches) document.querySelector('.ct-mobile-tabs [data-mobile-view="orders"]').click();
            document.querySelector('.ct-orders').scrollIntoView({ block: 'nearest' });
        };
        A.icons(); $('ctReceiptDialog').showModal();
        $('ctReceiptTitle').focus({ preventScroll: true }); $('ctReceiptDialog').scrollTop = 0;
    }
    function decimal(value) {
        if (!DecimalNumber || !/^(?:\d{1,18}(?:\.\d{0,12})?|\.\d{1,12})$/.test(String(value))) return null;
        const result = new DecimalNumber(value);
        return result.isFinite() && result.gt(0) && result.lte('1000000000000000') ? result : null;
    }
    function iconMarkup(symbol) {
        return known[symbol] ? `<span class="ct-pair-icon"><img src="assets/crypto/${symbol.toLowerCase()}.svg" alt=""></span>` : `<span class="ct-pair-icon is-generic">${A.escape(symbol.charAt(0))}</span>`;
    }
    function renderPairs() {
        const term = $('ctPairSearch').value.toLowerCase().trim();
        const priority = ['BTC', 'ETH', 'USDT', 'SOL', 'XRP', 'ADA', 'DOGE'];
        const list = [...M.state.products].sort((a, b) => (priority.indexOf(a.symbol) < 0 ? 99 : priority.indexOf(a.symbol)) - (priority.indexOf(b.symbol) < 0 ? 99 : priority.indexOf(b.symbol)))
            .filter(product => `${product.symbol} ${known[product.symbol] || product.name}`.toLowerCase().includes(term));
        $('ctPairs').innerHTML = list.map(product => `<button class="ct-pair-option" type="button" data-pair="${A.escape(product.id)}" aria-pressed="${product.id === M.state.product?.id}">${iconMarkup(product.symbol)}<span><strong>${A.escape(product.symbol)} / USD</strong><small>${A.escape(known[product.symbol] || product.name)}</small></span>${product.id === M.state.product?.id ? A.icon('check') : ''}</button>`).join('');
        $('ctPairsMessage').hidden = !!list.length;
        $('ctPairsMessage').textContent = M.state.products.length ? 'No matching markets.' : 'Market list is temporarily unavailable.';
        A.icons();
    }
    function renderSummary() {
        const s = M.state, symbol = s.product?.symbol || s.requested;
        $('ctPairName').textContent = `${symbol} / USD`; $('ctAssetName').textContent = known[symbol] || s.product?.name || symbol;
        if ($('ctPairIcon').dataset.symbol !== symbol) {
            $('ctPairIcon').outerHTML = iconMarkup(symbol).replace('class="', 'id="ctPairIcon" class="');
            $('ctPairIcon').dataset.symbol = symbol;
        }
        $('ctQuantitySymbol').textContent = symbol; $('ctVolumeSymbol').textContent = symbol;
        $('ctPrice').textContent = money(s.ticker?.price); $('ctBookPrice').textContent = price(s.ticker?.price);
        $('ctHigh').textContent = price(s.ticker?.high); $('ctLow').textContent = price(s.ticker?.low); $('ctVolume').textContent = number(s.ticker?.volume, 2);
        const change = s.ticker?.open > 0 ? (s.ticker.price - s.ticker.open) / s.ticker.open * 100 : null;
        $('ctChange').textContent = change === null ? '--' : `${change >= 0 ? '+' : '-'}${number(Math.abs(change), 2)}% (24h)`;
        $('ctChange').className = change > 0 ? 'is-up' : change < 0 ? 'is-down' : '';
        $('ctFeedStatus').textContent = s.errors.market ? 'Market unavailable' : !s.ticker ? 'Connecting...' : !M.fresh() || s.errors.ticker ? 'Updates delayed' : s.connected && s.tickerSource === 'stream' ? 'Streaming' : 'Updated ' + new Date(s.tickerAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    }
    function renderBook() {
        const s = M.state;
        function rows(levels, ask) {
            let total = 0;
            const sizes = levels.map(level => ({ ...level, total: (total += level.size) }));
            const maximum = Math.max(...sizes.map(level => level.total), .000001);
            if (ask) sizes.reverse();
            return sizes.map(level => `<button type="button" class="ct-book-row ${ask ? 'is-ask' : 'is-bid'}" data-price="${level.price}" title="Use ${price(level.price)} as limit price" style="--depth:${(level.total / maximum * 100).toFixed(2)}%"><span>${price(level.price)}</span><span>${size(level.size)}</span><span>${size(level.total)}</span></button>`).join('');
        }
        $('ctAsks').innerHTML = rows(s.asks, true); $('ctBids').innerHTML = rows(s.bids, false);
        $('ctBookMessage').hidden = !!s.bids.length && !!s.asks.length && !s.errors.book;
        $('ctBookMessage').textContent = s.errors.market || s.errors.book || 'Loading market depth...';
        const spread = s.asks[0] && s.bids[0] ? s.asks[0].price - s.bids[0].price : null;
        $('ctSpread').textContent = spread !== null ? price(spread) : '--';
        $('ctRecentTrades').innerHTML = s.trades.slice(0, 16).map(trade => `<div class="ct-trade-row"><span class="${trade.side === 'buy' ? 'is-up' : 'is-down'}">${price(trade.price)}</span><span>${size(trade.size)}</span><span>${new Date(trade.time).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' })}</span></div>`).join('');
        $('ctTradesMessage').hidden = !!s.trades.length && !s.errors.trades;
        $('ctTradesMessage').textContent = s.errors.market || s.errors.trades || 'Loading recent trades...';
    }
    function renderOhlc(candle = M.state.candles.at(-1)) {
        for (const [id, field] of [['ctOpen', 'open'], ['ctCandleHigh', 'high'], ['ctCandleLow', 'low'], ['ctClose', 'close']]) $(id).textContent = price(candle?.[field]);
        $('ctCandleVolume').textContent = number(candle?.volume, 2);
    }
    function makeChart() {
        if (chart || !window.LightweightCharts) return;
        const L = LightweightCharts;
        chart = L.createChart($('ctChart'), {
            autoSize: true, layout: { background: { type: L.ColorType.Solid, color: '#111827' }, textColor: '#96a7b8', fontSize: 10, fontFamily: 'Inter, sans-serif', attributionLogo: true },
            grid: { vertLines: { color: '#26324070' }, horzLines: { color: '#26324070' } },
            rightPriceScale: { borderColor: '#374151', scaleMargins: { top: .1, bottom: .24 } },
            timeScale: { borderColor: '#374151', timeVisible: true, secondsVisible: false, rightOffset: 6, barSpacing: 6 },
            crosshair: { mode: L.CrosshairMode.Normal, vertLine: { color: '#91a9bc80', labelBackgroundColor: '#334655' }, horzLine: { color: '#91a9bc80', labelBackgroundColor: '#334655' } },
            handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
            handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
            localization: { locale: 'en-US', timeFormatter: time => new Date(Number(time) * 1000).toLocaleString('en-GB', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
        });
        candles = chart.addSeries(L.CandlestickSeries, { upColor: '#70dfb0', downColor: '#ff8795', borderVisible: false, wickUpColor: '#70dfb0', wickDownColor: '#ff8795', priceLineColor: '#8ea2b5' });
        volume = chart.addSeries(L.HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '', lastValueVisible: false, priceLineVisible: false, visible: $('ctShowVolume').checked });
        volume.priceScale().applyOptions({ scaleMargins: { top: .8, bottom: 0 } });
        chart.subscribeCrosshairMove(event => {
            activeCandle = event.time ? event.seriesData.get(candles) : null;
            const current = activeCandle ? { ...activeCandle, volume: event.seriesData.get(volume)?.value } : undefined;
            renderOhlc(current);
        });
    }
    function renderChart(kind) {
        const s = M.state, error = s.errors.market || s.errors.candles || (!window.LightweightCharts ? 'Chart is temporarily unavailable.' : null);
        const message = error || (s.loading || !s.candles.length ? 'Loading candles...' : null);
        $('ctChartMessage').hidden = !message; $('ctChartMessageText').textContent = message || '';
        $('ctRetryChart').hidden = !error;
        if (message) { renderOhlc(); return; }
        makeChart();
        if (!chart) return;
        const key = `${s.product.id}:${s.interval}`;
        if (chartKey !== key || kind === 'history') {
            candles.applyOptions({ priceFormat: { type: 'price', precision: digits(), minMove: s.product.increment } });
            candles.setData(s.candles.map(({ volume: ignored, ...candle }) => candle));
            volume.setData(s.candles.map(candle => ({ time: candle.time, value: candle.volume, color: candle.close >= candle.open ? '#70dfb040' : '#ff879540' })));
            chart.timeScale().fitContent(); chartKey = key; activeCandle = null;
        } else {
            const last = s.candles.at(-1);
            candles.update({ time: last.time, open: last.open, high: last.high, low: last.low, close: last.close });
            volume.update({ time: last.time, value: last.volume, color: last.close >= last.open ? '#70dfb040' : '#ff879540' });
        }
        $('ctChart').setAttribute('aria-label', `${known[s.product.symbol] || s.product.symbol} candlestick chart, ${s.interval / 60} minute candles, prices in USD and time in UTC`);
        if (!activeCandle) renderOhlc();
    }
    function quote() { return type === 'limit' ? decimal($('ctLimitPrice').value) : decimal(String(M.state.ticker?.price || '')); }
    function canConvertBtc() { return side === 'buy' && !!T.state.account && !T.state.saving && !T.state.error && new DecimalNumber(T.available('BTC')).gt(0); }
    function renderAccount() {
        const s = T.state, symbol = M.state.product?.symbol || M.state.requested, currency = side === 'buy' ? 'USD' : symbol;
        const formatted = value => currency === 'USD' ? A.money(value) : `${number(value, Number(value) < .0001 && Number(value) > 0 ? 12 : 8)} ${currency}`;
        $('ctAvailableLabel').textContent = `Available ${currency}`;
        $('ctAvailable').textContent = s.account ? formatted(T.available(currency)) : '--';
        $('ctReserved').textContent = s.account ? formatted(s.account.reserved?.[currency] || '0') : '--';
        $('ctAssetBalanceLabel').textContent = `Spot ${symbol} holdings`;
        $('ctAssetBalance').textContent = s.account ? `${new DecimalNumber(T.available(symbol)).toFixed()} ${symbol}` : '--';
        $('ctTradingAccount').textContent = s.account ? 'CoinVault' : s.waitingForBalance ? 'Awaiting balance' : s.error ? 'Unavailable' : 'Connecting...';
        const error = A.state.error || s.error;
        $('ctAccountError').hidden = !error; $('ctAccountError').textContent = error || '';
        $('ctSimulationNotice').textContent = s.account ? s.account.initializationMode === 'asset-copy' ? '' : `` :
            s.waitingForBalance ? 'Connect a funded CoinVault wallet to initialize your holdings.' : '';
        $('ctConfirmOrder').disabled = s.saving;
    }
    function renderOrders() {
        const account = T.state.account;
        $('ctOpenOrdersTab').textContent = `Open orders${account ? ` (${account.openOrders.length})` : ''}`;
        $('ctOrderHistoryTab').textContent = `Order history${account ? ` (${account.orders.filter(order => order.status !== 'open').length})` : ''}`;
        const list = account ? (ordersView === 'open' ? [...account.openOrders].reverse() : account.orders.filter(order => order.status !== 'open')) : [];
        if (!list.length) {
            $('ctOrdersContent').innerHTML = `<div class="ct-orders-empty">${A.icon('clipboard')}<strong>${account ? ordersView === 'open' ? 'No open simulated orders' : 'No simulated trades yet' : T.state.error ? 'Orders are temporarily unavailable' : 'Your simulated portfolio'}</strong><p>${account ? ordersView === 'open' ? 'Limit orders appear here until filled or cancelled.' : 'Completed and cancelled simulated orders appear here.' : 'Your starting funds are copied from your CoinVault balance.'}</p></div>`;
        } else {
            $('ctOrdersContent').innerHTML = `<div class="ct-record-head"><span>Market</span><span>Order</span><span>Amount</span><span>Price (USD)</span><span>Status</span><span></span></div>` + list.map(order => {
                const symbol = order.productId.slice(0, -4), label = order.status === 'filled' ? 'Order fill' : order.status === 'cancelled' ? 'Cancelled' : 'Open';
                return `<div class="ct-record" data-order-id="${A.escape(order.id)}"><div class="ct-record-market"><strong>${A.escape(symbol)} / USD</strong><small>${A.escape(new Date(order.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</small></div><span class="ct-record-kind ${order.side === 'buy' ? 'is-up' : 'is-down'}">${order.side === 'buy' ? 'Buy' : 'Sell'} / ${order.type === 'market' ? 'Market' : 'Limit'}</span><span class="ct-record-amount">${A.escape(order.quantity)}</span><span class="ct-record-price">${A.escape(order.fillPrice || order.limitPrice || '--')}</span><span class="ct-record-status">${label}</span><span class="ct-record-action"><button class="cv-icon" type="button" data-receipt-order="${A.escape(order.id)}" aria-label="View ${A.escape(symbol)} order receipt" title="View receipt">${A.icon('file-text')}</button>${order.status === 'open' ? `<button class="cv-icon" type="button" data-cancel-order="${A.escape(order.id)}" aria-label="Cancel simulated ${A.escape(symbol)} order" title="Cancel order" ${T.state.saving ? 'disabled' : ''}>${A.icon('x')}</button>` : ''}</span></div>`;
            }).join('');
        }
        if (ordersView === 'open' && account?.openOrders.length) $('ctOrdersContent').insertAdjacentHTML('beforeend', `<p class="ct-limit-note">${T.state.unavailable.length ? 'Some orders are waiting for current market prices. ' : ''}Simulated limit orders are checked while this page is open.</p>`);
        A.icons();
    }
    function calculate(showError = false) {
        const current = quote(), amount = decimal($('ctQuantity').value), total = decimal($('ctNotional').value);
        if (current) {
            if (inputSource === 'notional' && total) { const step = new DecimalNumber(M.state.product?.baseIncrement || '0.00000001'); $('ctQuantity').value = total.div(current).div(step).floor().mul(step).toFixed(); }
            else if (inputSource === 'quantity' && amount) $('ctNotional').value = amount.mul(current).toDecimalPlaces(Math.max(2, digits())).toFixed(Math.max(2, digits()));
            else if (inputSource === 'quantity' && !amount) $('ctNotional').value = '';
            else if (inputSource === 'notional' && !total) $('ctQuantity').value = '';
        }
        const size = decimal($('ctQuantity').value);
        const currency = side === 'buy' ? 'USD' : M.state.product?.symbol;
        const value = current && size ? size.mul(current).toDecimalPlaces(18, side === 'buy' ? DecimalNumber.ROUND_UP : DecimalNumber.ROUND_DOWN) : null;
        const fee = value ? feeFor(value) : null;
        const net = value ? side === 'buy' ? value.plus(fee) : value.minus(fee) : null;
        $('ctEstimatedFee').textContent = fee ? usd(fee) : '--';
        $('ctEstimatedTotal').textContent = net ? usd(net) : '--';
        $('ctEstimatedTotalLabel').textContent = side === 'buy' ? 'Estimated total' : 'Estimated proceeds';
        const required = current && size ? side === 'buy' ? net : size : null;
        const insufficient = !!required && !!T.state.account && required.gt(T.available(currency));
        const wrongStep = !!size && !!M.state.product && !size.mod(M.state.product.baseIncrement || '0.00000001').eq(0);
        const valid = !!M.state.product && !!current && !!size && M.fresh() && !A.state.error && !!T.state.account && !T.state.saving && !T.state.error && !insufficient && !wrongStep;
        const needsConversion = insufficient && canConvertBtc();
        $('ctQuantity').closest('.ct-input-wrap').classList.toggle('has-error', insufficient || wrongStep);
        $('ctQuantity').setAttribute('aria-invalid', String(insufficient || wrongStep));
        $('ctReviewOrder').disabled = !valid;
        $('ctReviewOrder').querySelector('span').textContent = `Review ${side} order`;
        if (insufficient || wrongStep || showError) $('ctOrderError').textContent = insufficient ? `Insufficient simulated ${currency} balance.` : wrongStep ? `Use an amount in increments of ${M.state.product.baseIncrement}.` : !M.fresh() ? 'A current market quote is required.' : !current ? 'Enter a valid positive price.' : !size ? 'Enter a valid positive amount.' : A.state.error ? 'Your account is temporarily unavailable.' : '';
        else $('ctOrderError').textContent = '';
        if (needsConversion) {
            $('ctOrderError').textContent = 'Sell or convert some simulated BTC to USD before buying this asset. ';
            const link = document.createElement('a');
            link.href = 'trade.html?asset=BTC&side=sell'; link.textContent = 'Go to BTC/USD';
            $('ctOrderError').append(link);
        }
        return valid ? { symbol: M.state.product.symbol, side, type, price: current, amount: size, total: value, fee, net } : null;
    }
    function setSide(value) {
        side = value;
        document.querySelectorAll('[data-side]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.side === side)));
        $('ctReviewOrder').classList.toggle('is-sell', side === 'sell');
        $('ctReviewOrder').querySelector('span').textContent = `Review ${side} order`; renderAccount(); calculate();
    }
    function setType(value) {
        type = value;
        document.querySelectorAll('[data-order-type]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.orderType === type)));
        $('ctLimitPrice').disabled = type === 'market'; $('ctLimitPrice').placeholder = type === 'market' ? 'Market price' : '0.00';
        if (type === 'limit' && !$('ctLimitPrice').value && M.state.ticker) $('ctLimitPrice').value = String(M.state.ticker.price);
        if (type === 'market') $('ctLimitPrice').value = '';
        $('ctOrderError').textContent = ''; calculate();
    }
    function switchTabs(button, data, prefix) {
        const group = button.parentElement;
        group.querySelectorAll('button').forEach(item => { const selected = item === button; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; });
        if (prefix === 'book') { $('ctBookPanel').hidden = data !== 'book'; $('ctTradesPanel').hidden = data !== 'trades'; }
        else {
            $('ctOrdersContent').setAttribute('aria-labelledby', button.id);
            ordersView = data; renderOrders();
        }
    }
    function init() {
        const query = new URLSearchParams(location.search), requested = String(query.get('asset') || 'BTC').toUpperCase();
        if (query.get('from') === 'dashboard') {
            const back = document.querySelector('.ct-back');
            back.href = 'index.html';
            back.innerHTML = A.icon('arrow-left') + 'Dashboard';
            const breadcrumb = document.querySelector('.cv-breadcrumb a');
            breadcrumb.href = 'index.html';
            breadcrumb.textContent = 'Dashboard';
        }
        document.querySelector('.cv-rail a[href="market.html"]')?.classList.add('active');
        $('ctYear').textContent = String(new Date().getFullYear());
        $('ctPairButton').onclick = () => { renderPairs(); $('ctPairDialog').showModal(); $('ctPairSearch').focus(); };
        $('ctPairSearch').oninput = renderPairs;
        $('ctPairs').onclick = event => {
            const button = event.target.closest('[data-pair]'); if (!button) return;
            M.select(button.dataset.pair); $('ctPairDialog').close();
            const url = new URL(location.href); url.searchParams.set('asset', button.dataset.pair.slice(0, -4)); history.replaceState(null, '', url);
            $('ctQuantity').value = $('ctNotional').value = $('ctLimitPrice').value = ''; inputSource = 'quantity'; calculate();
        };
        document.querySelectorAll('[data-close]').forEach(button => button.onclick = () => $(button.dataset.close).close());
        document.querySelectorAll('[data-interval]').forEach(button => button.onclick = () => {
            document.querySelectorAll('[data-interval]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
            M.loadCandles(Number(button.dataset.interval));
        });
        $('ctResetChart').onclick = () => chart?.timeScale().fitContent();
        $('ctShowVolume').onchange = () => volume?.applyOptions({ visible: $('ctShowVolume').checked });
        $('ctExpandChart').onclick = () => {
            const section = document.querySelector('.ct-chart-section'), expanded = section.classList.toggle('is-expanded');
            document.body.style.overflow = expanded ? 'hidden' : '';
            if (expanded) { section.setAttribute('role', 'dialog'); section.setAttribute('aria-modal', 'true'); }
            else { section.removeAttribute('role'); section.removeAttribute('aria-modal'); }
            if (expanded) expandedOrigin = document.activeElement;
            $('ctExpandChart').title = expanded ? 'Collapse chart' : 'Expand chart'; $('ctExpandChart').setAttribute('aria-label', $('ctExpandChart').title);
            $('ctExpandChart').innerHTML = A.icon(expanded ? 'minimize-2' : 'maximize-2'); A.icons();
            if (!expanded) expandedOrigin?.focus();
        };
        document.addEventListener('keydown', event => {
            const expanded = document.querySelector('.ct-chart-section.is-expanded');
            if (!expanded) return;
            if (event.key === 'Escape') $('ctExpandChart').click();
            if (event.key === 'Tab') {
                const controls = [...expanded.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')].filter(control => control.getClientRects().length);
                if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
                else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
            }
        });
        $('ctRetryChart').onclick = () => { if (M.state.product) M.loadCandles(); else M.start(M.state.requested); M.refresh(); };
        $('ctRefreshMarket').onclick = () => { M.refresh(); if (M.state.errors.candles) M.loadCandles(); };
        document.querySelectorAll('[data-mobile-view]').forEach(button => { if (button.tagName === 'BUTTON') button.onclick = () => {
            $('cvDashboard').dataset.mobileView = button.dataset.mobileView;
            document.querySelectorAll('.ct-mobile-tabs button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
            requestAnimationFrame(() => chart?.resize($('ctChart').clientWidth, $('ctChart').clientHeight));
        }; });
        document.querySelectorAll('[data-book-view],[data-orders-view]').forEach(button => {
            button.onclick = () => switchTabs(button, button.dataset.bookView || button.dataset.ordersView, button.dataset.bookView ? 'book' : 'orders');
            button.onkeydown = event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault(); const siblings = [...button.parentElement.querySelectorAll('button')], current = siblings.indexOf(button);
                const index = event.key === 'Home' ? 0 : event.key === 'End' ? siblings.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + siblings.length) % siblings.length;
                siblings[index].click(); siblings[index].focus();
            };
        });
        document.querySelectorAll('[data-side]').forEach(button => button.onclick = () => setSide(button.dataset.side));
        document.querySelectorAll('[data-order-type]').forEach(button => button.onclick = () => setType(button.dataset.orderType));
        $('ctQuantity').oninput = () => { inputSource = 'quantity'; $('ctOrderError').textContent = ''; calculate(); };
        $('ctNotional').oninput = () => { inputSource = 'notional'; $('ctOrderError').textContent = ''; calculate(); };
        $('ctLimitPrice').oninput = () => { $('ctOrderError').textContent = ''; calculate(); };
        $('ctBookPanel').onclick = event => {
            const row = event.target.closest('[data-price]'); if (!row) return;
            setType('limit'); $('ctLimitPrice').value = row.dataset.price; calculate();
            if (matchMedia('(max-width:700px)').matches) document.querySelector('.ct-mobile-tabs [data-mobile-view="order"]').click();
        };
        $('ctOrderForm').onsubmit = event => {
            event.preventDefault(); const estimate = calculate(true);
            if (!estimate) return;
            pendingOrder = { clientOrderId: crypto.randomUUID(), productId: M.state.product.id, side: estimate.side, type: estimate.type, quantity: estimate.amount.toFixed(), ...(estimate.type === 'limit' ? { limitPrice: estimate.price.toFixed() } : {}) };
            const entries = [['Market', `${estimate.symbol} / USD`], ['Order type', estimate.type === 'market' ? 'Market' : 'Limit'], ['Estimated price', usd(estimate.price)], ['Order value', usd(estimate.total)], ['Simulated fee (0.10%)', usd(estimate.fee)], [estimate.side === 'buy' ? 'Estimated total' : 'Estimated proceeds', usd(estimate.net)]];
            $('ctReviewAmount').textContent = `${estimate.side === 'buy' ? 'Buy' : 'Sell'} ${estimate.amount.toFixed()} ${estimate.symbol}`;
            $('ctReviewDetails').innerHTML = receiptRows(entries);
            $('ctReviewError').textContent = '';
            $('ctConfirmOrder').querySelector('span').textContent = `Confirm simulated ${estimate.side}`;
            $('ctReviewDisclosure').textContent = 'Only your simulated portfolio is updated. No real assets are purchased or sold.' + (estimate.type === 'limit' ? ' Funds are reserved until filled or cancelled. Limit orders are checked while this page is open.' : ' The fill uses a current market quote and may differ from this estimate.');
            $('ctReviewDialog').showModal(); $('ctReviewDialog').scrollTop = 0;
        };
        $('ctConfirmOrder').onclick = async () => {
            if (!pendingOrder || T.state.saving) return;
            const order = pendingOrder; $('ctReviewError').textContent = '';
            try {
                const result = await T.place(order);
                pendingOrder = null; $('ctReviewDialog').close();
                $('ctQuantity').value = $('ctNotional').value = ''; calculate();
                const tab = result.order.status === 'open' ? $('ctOpenOrdersTab') : $('ctOrderHistoryTab'); tab.click();
                showReceipt(result.order);
            } catch (error) { $('ctReviewError').textContent = error.message; }
        };
        $('ctOrdersContent').onclick = async event => {
            const receipt = event.target.closest('[data-receipt-order]');
            if (receipt) { const order = T.state.account?.orders.find(item => item.id === receipt.dataset.receiptOrder); if (order) showReceipt(order); return; }
            const button = event.target.closest('[data-cancel-order]'); if (!button || T.state.saving) return;
            try { const result = await T.cancel(button.dataset.cancelOrder); A.toast(result.order.status === 'cancelled' ? 'Order cancelled. Reserved funds returned.' : 'This order has already filled.'); }
            catch (error) { A.toast(error.message); }
        };
        document.addEventListener('ct:data', event => {
            renderSummary(); renderBook(); renderChart(event.detail.kind); renderAccount(); calculate();
            if (event.detail.kind === 'selection' && $('ctPairDialog').open) renderPairs();
        });
        document.addEventListener('cv:data', () => { renderAccount(); calculate(); });
        document.addEventListener('ct:account', () => { renderAccount(); renderOrders(); calculate(); });
        A.icons(); M.start(requested); renderSummary(); renderAccount(); renderOrders();
        if (query.get('side') === 'sell') setSide('sell');
    }
    document.addEventListener('DOMContentLoaded', init);
})();
