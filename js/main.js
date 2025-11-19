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

// Fetch crypto prices from CoinGecko
async function fetchCryptoPrices() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin&vs_currencies=usd'
        );
        const data = await response.json();
        liveCryptoPrices = {
            BTC: data.bitcoin.usd,
            ETH: data.ethereum.usd,
            USDT: data.tether.usd,
            BNB: data.binancecoin.usd
        };
        updateCryptoDropdown();
    } catch (error) {
        console.error("Error fetching CoinGecko prices:", error);
        showToast("Failed to fetch live crypto prices", "error");
    }
}

// ✅ Working USD → GHS using ExchangeRate-API
async function fetchUsdToGhsRate() {
    try {
        // Use your own key from https://www.exchangerate-api.com/ (free signup)
        const response = await fetch('https://v6.exchangerate-api.com/v6/0cc9322f2c029905cbeaa56d/latest/USD');
        const data = await response.json();

        if (data && data.conversion_rates && data.conversion_rates.GHS) {
            usdToGhsRate = data.conversion_rates.GHS;
            console.log("✅ Live USD → GHS rate:", usdToGhsRate);
            showToast(`Live rate loaded: ₵${usdToGhsRate.toFixed(2)} per $1`, "success");
        } else {
            throw new Error("No GHS rate found");
        }
    } catch (error) {
        console.error("USD → GHS conversion failed:", error);
        showToast("Using default USD → GHS rate (₵15.00)", "error");
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

// Fetch live data every 60 seconds
setInterval(fetchCryptoPrices, 60000);
setInterval(fetchUsdToGhsRate, 60000);

// Initial load
fetchCryptoPrices();
fetchUsdToGhsRate();
