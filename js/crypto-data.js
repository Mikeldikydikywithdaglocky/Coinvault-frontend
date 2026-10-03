// crypto-data.js - Centralized cryptocurrency data
// Use this file in ALL pages for consistency

const CRYPTO_LIST = [
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        logo: 'assets/crypto/btc.svg',
        coingeckoId: 'bitcoin',
        color: '#F7931A'
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        logo: 'assets/crypto/eth.svg',
        coingeckoId: 'ethereum',
        color: '#627EEA'
    },
    {
        symbol: 'USDT',
        name: 'Tether',
        logo: 'assets/crypto/usdt.svg',
        coingeckoId: 'tether',
        color: '#26A17B'
    },
    {
        symbol: 'BNB',
        name: 'BNB',
        logo: 'assets/crypto/bnb.svg',
        coingeckoId: 'binancecoin',
        color: '#F3BA2F'
    },
    {
        symbol: 'SOL',
        name: 'Solana',
        logo: 'assets/crypto/sol.svg',
        coingeckoId: 'solana',
        color: '#14F195'
    },
    {
        symbol: 'XRP',
        name: 'Ripple',
        logo: 'assets/crypto/xrp.svg',
        coingeckoId: 'ripple',
        color: '#23292F'
    },
    {
        symbol: 'ADA',
        name: 'Cardano',
        logo: 'assets/crypto/ada.svg',
        coingeckoId: 'cardano',
        color: '#0033AD'
    },
    {
        symbol: 'DOGE',
        name: 'Dogecoin',
        logo: 'assets/crypto/doge.svg',
        coingeckoId: 'dogecoin',
        color: '#C2A633'
    }
];

// Get crypto by symbol
function getCryptoBySymbol(symbol) {
    return CRYPTO_LIST.find(c => c.symbol === symbol.toUpperCase());
}

// Get crypto by CoinGecko ID
function getCryptoById(id) {
    return CRYPTO_LIST.find(c => c.coingeckoId === id);
}

// Fetch live prices from CoinGecko
async function fetchLivePrices() {
    try {
        const ids = CRYPTO_LIST.map(c => c.coingeckoId).join(',');
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        const data = await response.json();
        
        // Add prices to crypto list
        CRYPTO_LIST.forEach(crypto => {
            const priceData = data[crypto.coingeckoId];
            if (priceData) {
                crypto.price = priceData.usd;
                crypto.change24h = priceData.usd_24h_change;
            }
        });
        
        return CRYPTO_LIST;
    } catch (error) {
        console.error('Error fetching prices:', error);
        return CRYPTO_LIST;
    }
}

// Format price
function formatPrice(price) {
    if (!price) return '$0.00';
    if (price >= 1) {
        return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

// Format large numbers
function formatLargeNumber(num) {
    if (!num) return '0';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}