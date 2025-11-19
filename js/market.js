// Market.js - WORKING VERSION
let allCryptos = [];
let isLoading = false;

async function fetchCryptoData() {
    if (isLoading) return;
    isLoading = true;
    
    const tableBody = document.getElementById('cryptoTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8">Loading crypto prices...</td></tr>';
    
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1');
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        allCryptos = data;
        displayCryptos(data);
        updateMarketStats(data);
        isLoading = false;
    } catch (error) {
        console.error('Error:', error);
        tableBody.innerHTML = `
            <tr><td colspan="7" class="text-center py-8">
                <div class="text-red-400 mb-2">⚠️ Failed to load data</div>
                <button onclick="fetchCryptoData()" class="bg-indigo-600 px-4 py-2 rounded mt-2">Retry</button>
            </td></tr>
        `;
        isLoading = false;
    }
}

function displayCryptos(cryptos) {
    const tableBody = document.getElementById('cryptoTable');
    if (!tableBody || !cryptos || cryptos.length === 0) return;
    
    tableBody.innerHTML = cryptos.map((crypto, index) => {
        const priceChange = crypto.price_change_percentage_24h || 0;
        const isPositive = priceChange >= 0;
        const changeClass = isPositive ? 'text-green-400' : 'text-red-400';
        
        return `
            <tr class="border-b border-gray-700 hover:bg-gray-700 transition">
                <td class="px-6 py-4 text-gray-400">${index + 1}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <img src="${crypto.image}" alt="${crypto.name}" class="w-8 h-8 rounded-full">
                        <div>
                            <div class="font-medium">${crypto.name}</div>
                            <div class="text-sm text-gray-400">${crypto.symbol.toUpperCase()}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-right font-medium">$${formatNumber(crypto.current_price)}</td>
                <td class="px-6 py-4 text-right ${changeClass} font-medium">
                    ${isPositive ? '▲' : '▼'} ${Math.abs(priceChange).toFixed(2)}%
                </td>
                <td class="px-6 py-4 text-right">$${formatLargeNumber(crypto.market_cap)}</td>
                <td class="px-6 py-4 text-right">$${formatLargeNumber(crypto.total_volume)}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="alert('Trade ${crypto.symbol.toUpperCase()}')" class="bg-indigo-600 hover:bg-indigo-700 px-4 py-1 rounded-lg text-sm">Trade</button>
                </td>
            </tr>
        `;
    }).join('');
}

function updateMarketStats(cryptos) {
    if (!cryptos || cryptos.length === 0) return;
    
    const totalMarketCap = cryptos.reduce((sum, c) => sum + (c.market_cap || 0), 0);
    const totalVolume = cryptos.reduce((sum, c) => sum + (c.total_volume || 0), 0);
    const btc = cryptos.find(c => c.symbol === 'btc');
    const btcDominance = btc ? ((btc.market_cap / totalMarketCap) * 100).toFixed(2) : 0;
    
    const capEl = document.getElementById('totalMarketCap');
    const volEl = document.getElementById('totalVolume');
    const domEl = document.getElementById('btcDominance');
    
    if (capEl) capEl.textContent = '$' + formatLargeNumber(totalMarketCap);
    if (volEl) volEl.textContent = '$' + formatLargeNumber(totalVolume);
    if (domEl) domEl.textContent = btcDominance + '%';
}

function formatNumber(num) {
    if (!num) return '0.00';
    return num >= 1 ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function formatLargeNumber(num) {
    if (!num) return '0';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

// Search
const searchInput = document.getElementById('searchCrypto');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allCryptos.filter(c => 
            c.name.toLowerCase().includes(term) || c.symbol.toLowerCase().includes(term)
        );
        displayCryptos(filtered);
    });
}

// Sort
const sortSelect = document.getElementById('sortBy');
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        let sorted = [...allCryptos];
        switch(e.target.value) {
            case 'price': sorted.sort((a, b) => b.current_price - a.current_price); break;
            case 'change': sorted.sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)); break;
            case 'volume': sorted.sort((a, b) => b.total_volume - a.total_volume); break;
            default: sorted.sort((a, b) => b.market_cap - a.market_cap);
        }
        displayCryptos(sorted);
    });
}

// Load on start
document.addEventListener('DOMContentLoaded', fetchCryptoData);
setInterval(fetchCryptoData, 60000); // Refresh every 60 seconds