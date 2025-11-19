// crypto-data.js - Centralized cryptocurrency data
// Use this file in ALL pages for consistency

const CRYPTO_LIST = [
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
        coingeckoId: 'bitcoin',
        color: '#F7931A'
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        coingeckoId: 'ethereum',
        color: '#627EEA'
    },
    {
        symbol: 'USDT',
        name: 'Tether',
        logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
        coingeckoId: 'tether',
        color: '#26A17B'
    },
    {
        symbol: 'BNB',
        name: 'BNB',
        logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
        coingeckoId: 'binancecoin',
        color: '#F3BA2F'
    },
    {
        symbol: 'SOL',
        name: 'Solana',
        logo: 'https://cryptologos.cc/logos/solana-sol-logo.png',
        coingeckoId: 'solana',
        color: '#14F195'
    },
    {
        symbol: 'XRP',
        name: 'Ripple',
        logo: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
        coingeckoId: 'ripple',
        color: '#23292F'
    },
    {
        symbol: 'ADA',
        name: 'Cardano',
        logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png',
        coingeckoId: 'cardano',
        color: '#0033AD'
    },
    {
        symbol: 'DOGE',
        name: 'Dogecoin',
        logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
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