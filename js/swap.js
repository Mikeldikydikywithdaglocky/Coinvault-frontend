// Swap.js - Token swap functionality

const popularTokens = [
    { symbol: 'BTC', name: 'Bitcoin', image: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', price: 43250 },
    { symbol: 'ETH', name: 'Ethereum', image: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', price: 2280 },
    { symbol: 'USDT', name: 'Tether', image: 'https://cryptologos.cc/logos/tether-usdt-logo.png', price: 1 },
    { symbol: 'BNB', name: 'BNB', image: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', price: 315 },
    { symbol: 'SOL', name: 'Solana', image: 'https://cryptologos.cc/logos/solana-sol-logo.png', price: 98 },
    { symbol: 'XRP', name: 'Ripple', image: 'https://cryptologos.cc/logos/xrp-xrp-logo.png', price: 0.52 },
    { symbol: 'ADA', name: 'Cardano', image: 'https://cryptologos.cc/logos/cardano-ada-logo.png', price: 0.45 },
    { symbol: 'DOGE', name: 'Dogecoin', image: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png', price: 0.09 }
];

let currentSelection = 'from';
let selectedFromToken = popularTokens[0];
let selectedToToken = popularTokens[1];

// Load user balances
const userBalances = {
    'BTC': 0.0523,
    'ETH': 1.245,
    'USDT': 5000,
    'BNB': 10.5,
    'SOL': 25,
    'XRP': 1000,
    'ADA': 5000,
    'DOGE': 10000
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateBalances();
    feather.replace();
});

// Update balance displays
function updateBalances() {
    document.getElementById('fromBalance').textContent = (userBalances[selectedFromToken.symbol] || 0).toFixed(4);
    document.getElementById('toBalance').textContent = (userBalances[selectedToToken.symbol] || 0).toFixed(4);
}

// Calculate swap
function calculateSwap() {
    const fromAmount = parseFloat(document.getElementById('fromAmount').value) || 0;
    const fromPrice = selectedFromToken.price;
    const toPrice = selectedToToken.price;
    
    if (fromAmount <= 0) {
        document.getElementById('swapBtn').textContent = 'Enter amount';
        document.getElementById('swapBtn').disabled = true;
        document.getElementById('swapDetails').classList.add('hidden');
        return;
    }
    
    // Check balance
    if (fromAmount > (userBalances[selectedFromToken.symbol] || 0)) {
        document.getElementById('swapBtn').textContent = 'Insufficient balance';
        document.getElementById('swapBtn').disabled = true;
        document.getElementById('swapDetails').classList.add('hidden');
        return;
    }
    
    // Calculate conversion
    const usdValue = fromAmount * fromPrice;
    const toAmount = usdValue / toPrice;
    const fee = toAmount * 0.003; // 0.3% fee
    const finalAmount = toAmount - fee;
    
    // Update UI
    document.getElementById('toAmount').value = finalAmount.toFixed(6);
    document.getElementById('swapRate').textContent = `1 ${selectedFromToken.symbol} = ${(fromPrice / toPrice).toFixed(6)} ${selectedToToken.symbol}`;
    document.getElementById('swapFee').textContent = `${fee.toFixed(6)} ${selectedToToken.symbol}`;
    document.getElementById('youReceive').textContent = `${finalAmount.toFixed(6)} ${selectedToToken.symbol}`;
    
    document.getElementById('swapDetails').classList.remove('hidden');
    document.getElementById('swapBtn').textContent = `Swap ${selectedFromToken.symbol} for ${selectedToToken.symbol}`;
    document.getElementById('swapBtn').disabled = false;
}

// Set max amount
function setMaxAmount() {
    const maxBalance = userBalances[selectedFromToken.symbol] || 0;
    document.getElementById('fromAmount').value = maxBalance;
    calculateSwap();
}

// Swap tokens position
function swapTokens() {
    const temp = selectedFromToken;
    selectedFromToken = selectedToToken;
    selectedToToken = temp;
    
    document.getElementById('fromToken').textContent = selectedFromToken.symbol;
    document.getElementById('fromTokenImg').src = selectedFromToken.image;
    document.getElementById('toToken').textContent = selectedToToken.symbol;
    document.getElementById('toTokenImg').src = selectedToToken.image;
    
    updateBalances();
    document.getElementById('fromAmount').value = '';
    document.getElementById('toAmount').value = '';
    document.getElementById('swapDetails').classList.add('hidden');
    feather.replace();
}

// Show token selection modal
function showTokenSelect(type) {
    currentSelection = type;
    document.getElementById('tokenModal').classList.remove('hidden');
    document.getElementById('tokenModal').classList.add('flex');
    renderTokenList(popularTokens);
    feather.replace();
}

// Close token modal
function closeTokenModal() {
    document.getElementById('tokenModal').classList.add('hidden');
    document.getElementById('tokenModal').classList.remove('flex');
}

// Render token list
function renderTokenList(tokens) {
    const tokenList = document.getElementById('tokenList');
    tokenList.innerHTML = tokens.map(token => `
        <button onclick="selectToken('${token.symbol}')" class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition">
            <img src="${token.image}" class="w-8 h-8 rounded-full">
            <div class="flex-1 text-left">
                <div class="font-medium">${token.symbol}</div>
                <div class="text-sm text-gray-400">${token.name}</div>
            </div>
            <div class="text-right">
                <div class="font-medium">$${token.price.toLocaleString()}</div>
                <div class="text-sm text-gray-400">${(userBalances[token.symbol] || 0).toFixed(4)}</div>
            </div>
        </button>
    `).join('');
}

// Select token
function selectToken(symbol) {
    const token = popularTokens.find(t => t.symbol === symbol);
    
    if (currentSelection === 'from') {
        if (token.symbol === selectedToToken.symbol) {
            swapTokens();
            closeTokenModal();
            return;
        }
        selectedFromToken = token;
        document.getElementById('fromToken').textContent = token.symbol;
        document.getElementById('fromTokenImg').src = token.image;
    } else {
        if (token.symbol === selectedFromToken.symbol) {
            swapTokens();
            closeTokenModal();
            return;
        }
        selectedToToken = token;
        document.getElementById('toToken').textContent = token.symbol;
        document.getElementById('toTokenImg').src = token.image;
    }
    
    updateBalances();
    calculateSwap();
    closeTokenModal();
    feather.replace();
}

// Execute swap
async function executeSwap() {
    const fromAmount = parseFloat(document.getElementById('fromAmount').value);
    const toAmount = parseFloat(document.getElementById('toAmount').value);
    
    if (!fromAmount || fromAmount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (fromAmount > (userBalances[selectedFromToken.symbol] || 0)) {
        alert('Insufficient balance');
        return;
    }
    
    // Show loading
    const btn = document.getElementById('swapBtn');
    btn.textContent = 'Swapping...';
    btn.disabled = true;
    
    // Simulate swap delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update balances
    userBalances[selectedFromToken.symbol] -= fromAmount;
    userBalances[selectedToToken.symbol] = (userBalances[selectedToToken.symbol] || 0) + toAmount;
    
    // Add to recent swaps
    addRecentSwap(fromAmount, toAmount);
    
    // Show success
    showNotification(`Successfully swapped ${fromAmount} ${selectedFromToken.symbol} for ${toAmount.toFixed(6)} ${selectedToToken.symbol}`, 'success');
    
    // Reset form
    document.getElementById('fromAmount').value = '';
    document.getElementById('toAmount').value = '';
    updateBalances();
    document.getElementById('swapDetails').classList.add('hidden');
    btn.textContent = 'Enter amount';
    btn.disabled = true;
}

// Add recent swap
function addRecentSwap(fromAmount, toAmount) {
    const swapsContainer = document.getElementById('recentSwaps');
    const swapHTML = `
        <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div class="flex items-center gap-3">
                <div class="flex items-center">
                    <img src="${selectedFromToken.image}" class="w-6 h-6 rounded-full">
                    <i data-feather="arrow-right" class="w-4 h-4 mx-2 text-gray-400"></i>
                    <img src="${selectedToToken.image}" class="w-6 h-6 rounded-full">
                </div>
                <div>
                    <div class="font-medium">${fromAmount} ${selectedFromToken.symbol} → ${toAmount.toFixed(6)} ${selectedToToken.symbol}</div>
                    <div class="text-sm text-gray-400">${new Date().toLocaleString()}</div>
                </div>
            </div>
            <span class="text-green-400 text-sm">Success</span>
        </div>
    `;
    
    if (swapsContainer.querySelector('p')) {
        swapsContainer.innerHTML = swapHTML;
    } else {
        swapsContainer.insertAdjacentHTML('afterbegin', swapHTML);
    }
    feather.replace();
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Search tokens
document.getElementById('tokenSearch')?.addEventListener('input', (e) => {
    const search = e.target.value.toLowerCase();
    const filtered = popularTokens.filter(token => 
        token.name.toLowerCase().includes(search) || 
        token.symbol.toLowerCase().includes(search)
    );
    renderTokenList(filtered);
});