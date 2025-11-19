// Send.js - Send crypto functionality with validation

const cryptos = [
    { symbol: 'BTC', name: 'Bitcoin', image: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', balance: 0.0523, price: 43250, gasFee: 0.00001 },
    { symbol: 'ETH', name: 'Ethereum', image: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', balance: 1.245, price: 2280, gasFee: 0.002 },
    { symbol: 'USDT', name: 'Tether', image: 'https://cryptologos.cc/logos/tether-usdt-logo.png', balance: 5000, price: 1, gasFee: 1 },
    { symbol: 'BNB', name: 'BNB', image: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', balance: 10.5, price: 315, gasFee: 0.0005 }
];

let selectedCrypto = cryptos[0];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderCryptoList();
    feather.replace();
});

// Show crypto select modal
function showCryptoSelect() {
    document.getElementById('cryptoModal').classList.remove('hidden');
    document.getElementById('cryptoModal').classList.add('flex');
    feather.replace();
}

// Close crypto modal
function closeCryptoModal() {
    document.getElementById('cryptoModal').classList.add('hidden');
    document.getElementById('cryptoModal').classList.remove('flex');
}

// Render crypto list
function renderCryptoList() {
    const cryptoList = document.getElementById('cryptoList');
    cryptoList.innerHTML = cryptos.map(crypto => `
        <button onclick="selectCrypto('${crypto.symbol}')" class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 transition">
            <img src="${crypto.image}" class="w-10 h-10 rounded-full">
            <div class="flex-1 text-left">
                <div class="font-medium">${crypto.name}</div>
                <div class="text-sm text-gray-400">${crypto.symbol}</div>
            </div>
            <div class="text-right">
                <div class="font-medium">${crypto.balance} ${crypto.symbol}</div>
                <div class="text-sm text-gray-400">$${(crypto.balance * crypto.price).toFixed(2)}</div>
            </div>
        </button>
    `).join('');
}

// Select cryptocurrency
function selectCrypto(symbol) {
    selectedCrypto = cryptos.find(c => c.symbol === symbol);
    
    document.getElementById('selectedCrypto').textContent = selectedCrypto.name;
    document.getElementById('selectedCryptoImg').src = selectedCrypto.image;
    document.getElementById('cryptoBalance').textContent = selectedCrypto.balance;
    document.getElementById('cryptoSymbol').textContent = selectedCrypto.symbol;
    document.getElementById('amountSymbol').textContent = selectedCrypto.symbol;
    
    closeCryptoModal();
    calculateTotal();
    feather.replace();
}

// Validate address
function validateAddress(address) {
    if (!address || address.trim() === '') {
        return { valid: false, message: 'Please enter a recipient address' };
    }
    
    // Basic validation (42 chars for ETH, 26-35 for BTC)
    if (selectedCrypto.symbol === 'ETH' && address.length !== 42) {
        return { valid: false, message: 'Invalid Ethereum address (must be 42 characters)' };
    }
    
    if (selectedCrypto.symbol === 'BTC' && (address.length < 26 || address.length > 35)) {
        return { valid: false, message: 'Invalid Bitcoin address (must be 26-35 characters)' };
    }
    
    // Check if starts with 0x for ETH
    if (selectedCrypto.symbol === 'ETH' && !address.startsWith('0x')) {
        return { valid: false, message: 'Ethereum address must start with 0x' };
    }
    
    return { valid: true };
}

// Calculate total with gas fee
function calculateTotal() {
    const amount = parseFloat(document.getElementById('sendAmount').value) || 0;
    const addressInput = document.getElementById('recipientAddress').value;
    
    // Clear errors
    document.getElementById('addressError').classList.add('hidden');
    document.getElementById('amountError').classList.add('hidden');
    
    // Calculate USD value
    const usdValue = amount * selectedCrypto.price;
    document.getElementById('usdValue').textContent = usdValue.toFixed(2);
    
    if (amount <= 0) {
        document.getElementById('sendBtn').textContent = 'Review Transaction';
        document.getElementById('sendBtn').disabled = true;
        document.getElementById('txDetails').classList.add('hidden');
        return;
    }
    
    // Validate amount
    if (amount > selectedCrypto.balance) {
        document.getElementById('amountError').textContent = `Insufficient balance. You have ${selectedCrypto.balance} ${selectedCrypto.symbol}`;
        document.getElementById('amountError').classList.remove('hidden');
        document.getElementById('sendBtn').disabled = true;
        return;
    }
    
    // Check if amount + fee exceeds balance
    const gasFee = selectedCrypto.gasFee;
    const total = amount + gasFee;
    
    if (total > selectedCrypto.balance) {
        document.getElementById('amountError').textContent = `Amount + gas fee exceeds balance (${total.toFixed(8)} ${selectedCrypto.symbol})`;
        document.getElementById('amountError').classList.remove('hidden');
        document.getElementById('sendBtn').disabled = true;
        return;
    }
    
    // Validate address
    if (addressInput) {
        const validation = validateAddress(addressInput);
        if (!validation.valid) {
            document.getElementById('addressError').textContent = validation.message;
            document.getElementById('addressError').classList.remove('hidden');
            document.getElementById('sendBtn').disabled = true;
            return;
        }
    }
    
    // Show transaction details
    document.getElementById('detailAmount').textContent = `${amount} ${selectedCrypto.symbol}`;
    document.getElementById('detailFee').textContent = `${gasFee} ${selectedCrypto.symbol} ($${(gasFee * selectedCrypto.price).toFixed(2)})`;
    document.getElementById('detailTotal').textContent = `${total.toFixed(8)} ${selectedCrypto.symbol}`;
    document.getElementById('txDetails').classList.remove('hidden');
    
    // Enable button if address is filled
    if (addressInput) {
        document.getElementById('sendBtn').textContent = 'Review Transaction';
        document.getElementById('sendBtn').disabled = false;
    }
}

// Set max amount (balance - gas fee)
function setMaxSend() {
    const maxAmount = selectedCrypto.balance - selectedCrypto.gasFee;
    document.getElementById('sendAmount').value = maxAmount > 0 ? maxAmount.toFixed(8) : 0;
    calculateTotal();
}

// Scan QR code
function scanQR() {
    alert('QR Scanner - This feature requires camera access. For demo, you can paste the address manually.');
}

// Confirm send
function confirmSend() {
    const address = document.getElementById('recipientAddress').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    
    // Final validation
    const validation = validateAddress(address);
    if (!validation.valid) {
        document.getElementById('addressError').textContent = validation.message;
        document.getElementById('addressError').classList.remove('hidden');
        return;
    }
    
    if (amount <= 0 || amount > selectedCrypto.balance) {
        document.getElementById('amountError').textContent = 'Invalid amount';
        document.getElementById('amountError').classList.remove('hidden');
        return;
    }
    
    // Show confirmation modal
    const gasFee = selectedCrypto.gasFee;
    const total = amount + gasFee;
    
    document.getElementById('confirmAmount').textContent = `${amount} ${selectedCrypto.symbol}`;
    document.getElementById('confirmAddress').textContent = address.substring(0, 10) + '...' + address.substring(address.length - 8);
    document.getElementById('confirmFee').textContent = `${gasFee} ${selectedCrypto.symbol}`;
    document.getElementById('confirmTotal').textContent = `${total.toFixed(8)} ${selectedCrypto.symbol}`;
    
    document.getElementById('confirmModal').classList.remove('hidden');
    document.getElementById('confirmModal').classList.add('flex');
    feather.replace();
}

// Close confirmation modal
function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
    document.getElementById('confirmModal').classList.remove('flex');
}

// Execute send
async function executeSend() {
    const address = document.getElementById('recipientAddress').value;
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const gasFee = selectedCrypto.gasFee;
    
    // Close modal
    closeConfirmModal();
    
    // Show loading
    const btn = document.getElementById('sendBtn');
    btn.textContent = 'Processing...';
    btn.disabled = true;
    
    // Simulate transaction
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Update balance
    selectedCrypto.balance -= (amount + gasFee);
    document.getElementById('cryptoBalance').textContent = selectedCrypto.balance.toFixed(8);
    
    // Add to recent sends
    addRecentSend(address, amount);
    
    // Show success notification
    showNotification(`Successfully sent ${amount} ${selectedCrypto.symbol} to ${address.substring(0, 10)}...`, 'success');
    
    // Reset form
    document.getElementById('recipientAddress').value = '';
    document.getElementById('sendAmount').value = '';
    document.getElementById('txDetails').classList.add('hidden');
    btn.textContent = 'Review Transaction';
    btn.disabled = true;
}

// Add recent send
function addRecentSend(address, amount) {
    const container = document.getElementById('recentSends');
    const html = `
        <div class="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                    <i data-feather="arrow-up-right" class="w-5 h-5"></i>
                </div>
                <div>
                    <div class="font-medium">Sent ${amount} ${selectedCrypto.symbol}</div>
                    <div class="text-sm text-gray-400 font-mono">To: ${address.substring(0, 10)}...${address.substring(address.length - 8)}</div>
                    <div class="text-xs text-gray-500">${new Date().toLocaleString()}</div>
                </div>
            </div>
            <span class="text-green-400 text-sm">Success</span>
        </div>
    `;
    
    if (container.querySelector('p')) {
        container.innerHTML = html;
    } else {
        container.insertAdjacentHTML('afterbegin', html);
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
    }, 4000);
}

// Listen for input changes
document.getElementById('recipientAddress')?.addEventListener('input', calculateTotal);
document.getElementById('sendAmount')?.addEventListener('input', calculateTotal);