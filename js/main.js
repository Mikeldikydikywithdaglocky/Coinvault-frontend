// Main.js - FIXED VERSION

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success'
        ? 'bg-green-600'
        : type === 'error'
            ? 'bg-red-600'
            : 'bg-indigo-600';

    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg text-white ${bgColor} z-50`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(function() {
            toast.remove();
        }, 300);
    }, 3000);
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('CoinVault app loaded successfully!');

    try {
        const userStr = localStorage.getItem('user');
        if (userStr && userStr !== 'undefined') {
            const user = JSON.parse(userStr);
            console.log('User logged in:', user);
        }
    } catch (e) {
        console.warn('Could not parse user from localStorage');
        localStorage.removeItem('user');
    }
});

let liveCryptoPrices = {};
let usdToGhsRate = 0;
let fiatExchangeRates = {
    USD: 1,
    GHS: 15.0,
    NGN: 1450,
    KES: 129,
    ZAR: 18.4,
    UGX: 3800,
    TZS: 2550,
    XOF: 610
};

window.CV_FIAT_RATES = Object.assign({}, fiatExchangeRates);

async function fetchCryptoPrices() {
    const apis = [
        {
            name: 'Coinbase',
            url: 'https://api.coinbase.com/v2/exchange-rates?currency=USD',
            parse: (data) => {
                const rates = data.data.rates;
                return {
                    BTC: 1 / parseFloat(rates.BTC),
                    ETH: 1 / parseFloat(rates.ETH),
                    USDT: 1 / parseFloat(rates.USDT || rates.DAI || 1),
                    BNB: 1 / parseFloat(rates.BNB || 315)
                };
            }
        },
        {
            name: 'CryptoCompare',
            url: 'https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,USDT,BNB&tsyms=USD',
            parse: (data) => ({
                BTC: data.BTC?.USD || 43250,
                ETH: data.ETH?.USD || 2280,
                USDT: data.USDT?.USD || 1,
                BNB: data.BNB?.USD || 315
            })
        },
        {
            name: 'Binance',
            url: 'https://api.binance.com/api/v3/ticker/price',
            parse: (data) => {
                const btc = data.find((ticker) => ticker.symbol === 'BTCUSDT');
                const eth = data.find((ticker) => ticker.symbol === 'ETHUSDT');
                const bnb = data.find((ticker) => ticker.symbol === 'BNBUSDT');
                return {
                    BTC: parseFloat(btc?.price || 43250),
                    ETH: parseFloat(eth?.price || 2280),
                    USDT: 1,
                    BNB: parseFloat(bnb?.price || 315)
                };
            }
        }
    ];

    for (const api of apis) {
        try {
            console.log(`Trying ${api.name} API...`);

            const response = await fetch(api.url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            liveCryptoPrices = api.parse(data);

            console.log(`${api.name} API success:`, liveCryptoPrices);
            updateCryptoDropdown();
            return;
        } catch (error) {
            console.warn(`${api.name} failed:`, error.message);
        }
    }

    console.error('All crypto APIs failed. Using fallback prices.');
    liveCryptoPrices = {
        BTC: 43250,
        ETH: 2280,
        USDT: 1,
        BNB: 315
    };
    updateCryptoDropdown();
}

async function fetchFiatExchangeRates() {
    const apis = [
        {
            name: 'open.er-api.com',
            url: 'https://open.er-api.com/v6/latest/USD',
            parse: (data) => data && data.rates
        },
        {
            name: 'exchangerate-api.com',
            url: 'https://api.exchangerate-api.com/v4/latest/USD',
            parse: (data) => data && data.rates
        },
        {
            name: 'exchangerate.host',
            url: 'https://api.exchangerate.host/latest?base=USD&symbols=USD,GHS,NGN,KES,ZAR,UGX,TZS,XOF',
            parse: (data) => data && data.rates
        }
    ];

    for (const api of apis) {
        try {
            const response = await fetch(api.url);
            const data = await response.json();
            const rates = api.parse(data);

            if (!rates || !rates.GHS) {
                throw new Error('No GHS rate found');
            }

            fiatExchangeRates = Object.assign({}, fiatExchangeRates, rates);
            fiatExchangeRates.USD = 1;
            usdToGhsRate = fiatExchangeRates.GHS || usdToGhsRate || 15.0;
            window.CV_FIAT_RATES = Object.assign({}, fiatExchangeRates);

            console.log('Live fiat rates loaded from ' + api.name + ':', fiatExchangeRates);
            return;
        } catch (error) {
            console.warn(api.name + ' fiat conversion failed:', error.message);
        }
    }

    usdToGhsRate = fiatExchangeRates.GHS || 15.0;
    fiatExchangeRates.GHS = usdToGhsRate;
    fiatExchangeRates.USD = 1;
    window.CV_FIAT_RATES = Object.assign({}, fiatExchangeRates);
    console.warn('Using fallback fiat rates:', fiatExchangeRates);
}

function updateCryptoDropdown() {
    const dropdown = document.getElementById('buyCrypto');
    if (!dropdown) return;

    dropdown.innerHTML = `
        <option value="BTC|${liveCryptoPrices.BTC}">Bitcoin (BTC) - $${liveCryptoPrices.BTC.toLocaleString()}</option>
        <option value="ETH|${liveCryptoPrices.ETH}">Ethereum (ETH) - $${liveCryptoPrices.ETH.toLocaleString()}</option>
        <option value="USDT|${liveCryptoPrices.USDT}">Tether (USDT) - $${liveCryptoPrices.USDT.toLocaleString()}</option>
        <option value="BNB|${liveCryptoPrices.BNB}">BNB (BNB) - $${liveCryptoPrices.BNB.toLocaleString()}</option>
    `;

    if (typeof calculateBuy === 'function') calculateBuy();
}

function updateMomoAmountInGHS() {
    const amountInput = document.getElementById('buyAmount');
    const momoAmountDisplay = document.getElementById('momoAmountDisplay');
    if (!amountInput || !momoAmountDisplay) return;

    const amountUsd = parseFloat(amountInput.value) || 0;
    if (amountUsd > 0 && usdToGhsRate > 0) {
        const totalGhs = amountUsd * usdToGhsRate;
        momoAmountDisplay.value = `~ GHs${totalGhs.toFixed(2)} GHS`;
    } else {
        momoAmountDisplay.value = '';
    }
}

const originalCalculateBuy = window.calculateBuy;
window.calculateBuy = function() {
    if (typeof originalCalculateBuy === 'function') originalCalculateBuy();
    updateMomoAmountInGHS();
};

function shouldFetchFiatRates() {
    const lastFetch = localStorage.getItem('lastFiatRatesFetch');
    if (!lastFetch) return true;

    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    return (now - parseInt(lastFetch, 10)) > oneDayInMs;
}

async function fetchFiatExchangeRatesCached() {
    const cachedRates = localStorage.getItem('fiatExchangeRates');

    if (cachedRates && !shouldFetchFiatRates()) {
        fiatExchangeRates = Object.assign({}, fiatExchangeRates, JSON.parse(cachedRates));
        fiatExchangeRates.USD = 1;
        usdToGhsRate = fiatExchangeRates.GHS || 15.0;
        window.CV_FIAT_RATES = Object.assign({}, fiatExchangeRates);
        console.log('Using cached fiat rates:', fiatExchangeRates);
        return;
    }

    await fetchFiatExchangeRates();

    localStorage.setItem('fiatExchangeRates', JSON.stringify(fiatExchangeRates));
    localStorage.setItem('usdToGhsRate', usdToGhsRate.toString());
    localStorage.setItem('lastFiatRatesFetch', Date.now().toString());
    localStorage.setItem('lastUsdGhsFetch', Date.now().toString());
}

function shouldFetchUsdGhsRate() {
    return shouldFetchFiatRates();
}

async function fetchUsdToGhsRate() {
    await fetchFiatExchangeRates();
}

async function fetchUsdToGhsRateCached() {
    await fetchFiatExchangeRatesCached();
}

setInterval(fetchCryptoPrices, 120000);

fetchCryptoPrices();
fetchFiatExchangeRatesCached();
