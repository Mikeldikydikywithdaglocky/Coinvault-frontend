// Main.js - FIXED VERSION

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : 
                    type === 'error' ? 'bg-red-600' : 'bg-indigo-600';
    
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

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('CoinVault app loaded successfully!');
    
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (user) {
        console.log('User logged in:', JSON.parse(user));
    }
});


// ============ LIVE PRICE UPDATES ============

// Store latest rates
let liveCryptoPrices = {};
let usdToGhsRate = 0;

// Fetch crypto prices with multiple fallback APIs
async function fetchCryptoPrices() {
    // Define multiple APIs to try in order
    const apis = [
        {
            name: 'Coinbase',
            url: 'https://api.coinbase.com/v2/exchange-rates?currency=USD',
            parse: (data) => {
                const rates = data.data.rates;
                return {
                    BTC: 1 / parseFloat(rates.BTC),
                    ETH: 1 / parseFloat(rates.ETH),
                    USDT: 1 / parseFloat(rates.USDT || rates.DAI || 1), // Fallback if USDT missing
                    BNB: 1 / parseFloat(rates.BNB || 315) // Fallback if BNB missing
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
                const btc = data.find(t => t.symbol === 'BTCUSDT');
                const eth = data.find(t => t.symbol === 'ETHUSDT');
                const bnb = data.find(t => t.symbol === 'BNBUSDT');
                return {
                    BTC: parseFloat(btc?.price || 43250),
                    ETH: parseFloat(eth?.price || 2280),
                    USDT: 1,
                    BNB: parseFloat(bnb?.price || 315)
                };
            }
        }
    ];

    // Try each API until one works
    for (const api of apis) {
        try {
            console.log(`🔄 Trying ${api.name} API...`);
            
            const response = await fetch(api.url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            liveCryptoPrices = api.parse(data);
            
            console.log(`✅ ${api.name} API SUCCESS:`, liveCryptoPrices);
            updateCryptoDropdown();
            return; // Success! Stop trying other APIs
            
        } catch (error) {
            console.warn(`❌ ${api.name} failed:`, error.message);
            // Continue to next API
        }
    }
    
    // If ALL APIs fail, use fallback prices
    console.error("⚠️ All crypto APIs failed. Using fallback prices.");
    liveCryptoPrices = {
        BTC: 43250,
        ETH: 2280,
        USDT: 1,
        BNB: 315
    };
    updateCryptoDropdown();
}

// ✅ FREE UNLIMITED USD → GHS using exchangerate.host (NO API KEY!)
async function fetchUsdToGhsRate() {
    try {
        const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=GHS');
        const data = await response.json();

        if (data && data.rates && data.rates.GHS) {
            usdToGhsRate = data.rates.GHS;
            console.log("✅ Live USD → GHS rate:", usdToGhsRate);
        } else {
            throw new Error("No GHS rate found");
        }
    } catch (error) {
        console.error("USD → GHS conversion failed:", error);
        usdToGhsRate = 15.0;
    }
}



// Update dropdown with live prices
function updateCryptoDropdown() {
    const dropdown = document.getElementById('buyCrypto');
    if (!dropdown) return;

    dropdown.innerHTML = `
        <option value="BTC|${liveCryptoPrices.BTC}">Bitcoin (BTC) - $${liveCryptoPrices.BTC.toLocaleString()}</option>
        <option value="ETH|${liveCryptoPrices.ETH}">Ethereum (ETH) - $${liveCryptoPrices.ETH.toLocaleString()}</option>
        <option value="USDT|${liveCryptoPrices.USDT}">Tether (USDT) - $${liveCryptoPrices.USDT.toLocaleString()}</option>
        <option value="BNB|${liveCryptoPrices.BNB}">BNB (BNB) - $${liveCryptoPrices.BNB.toLocaleString()}</option>
    `;

    // Recalculate totals instantly
    if (typeof calculateBuy === 'function') calculateBuy();
}

// ✅ Update MoMo amount field to show live GHS conversion
function updateMomoAmountInGHS() {
    const amountUsd = parseFloat(document.getElementById('buyAmount').value) || 0;
    const momoAmountDisplay = document.getElementById('momoAmountDisplay');
    if (!momoAmountDisplay) return;

    if (amountUsd > 0 && usdToGhsRate > 0) {
        const totalGhs = amountUsd * usdToGhsRate;
        momoAmountDisplay.value = `≈ ₵${totalGhs.toFixed(2)} GHS`;
    } else {
        momoAmountDisplay.value = '';
    }
}


// Override calculateBuy to include live conversion
const originalCalculateBuy = window.calculateBuy;
window.calculateBuy = function() {
    if (typeof originalCalculateBuy === 'function') originalCalculateBuy();
    updateMomoAmountInGHS();
};

// ============ SMART RATE LIMITING ============

// Check if we need to fetch USD->GHS rate (once per 24 hours)
function shouldFetchUsdGhsRate() {
    const lastFetch = localStorage.getItem('lastUsdGhsFetch');
    if (!lastFetch) return true;
    
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours
    
    return (now - parseInt(lastFetch)) > oneDayInMs;
}

// Fetch USD->GHS with 24-hour cache
async function fetchUsdToGhsRateCached() {
    // Check if we have a cached rate
    const cachedRate = localStorage.getItem('usdToGhsRate');
    
    if (cachedRate && !shouldFetchUsdGhsRate()) {
        usdToGhsRate = parseFloat(cachedRate);
        console.log("✅ Using cached USD → GHS rate:", usdToGhsRate);
        return;
    }
    
    // Fetch new rate
    await fetchUsdToGhsRate();
    
    // Save to cache
    localStorage.setItem('usdToGhsRate', usdToGhsRate.toString());
    localStorage.setItem('lastUsdGhsFetch', Date.now().toString());
}

// Fetch crypto prices every 2 minutes (not every 60 seconds)
setInterval(fetchCryptoPrices, 120000); // 2 minutes

// Initial load
fetchCryptoPrices();
fetchUsdToGhsRateCached(); // Use cached version