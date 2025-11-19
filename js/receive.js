// Receive.js - QR code generation and address management

const walletAddresses = {
    'BTC': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    'ETH': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    'USDT': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    'BNB': 'bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2'
};

let currentCrypto = 'BTC';
let qrcode = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    generateQRCode('BTC');
    feather.replace();
});

// Select cryptocurrency
function selectCrypto(symbol, name, image) {
    currentCrypto = symbol;
    
    // Update active state
    document.querySelectorAll('.crypto-btn').forEach(btn => {
        btn.classList.remove('active', 'ring-2', 'ring-indigo-500');
    });
    document.querySelector(`[data-crypto="${symbol}"]`).classList.add('active', 'ring-2', 'ring-indigo-500');
    
    // Update UI
    document.getElementById('currentCryptoName').textContent = name;
    document.getElementById('currentCryptoImg').src = image;
    document.getElementById('walletAddress').textContent = walletAddresses[symbol];
    document.getElementById('warningCrypto').textContent = `${name} (${symbol})`;
    document.getElementById('copyBtnText').textContent = 'Copy Address';
    
    // Generate new QR code
    generateQRCode(symbol);
    feather.replace();
}

// Generate QR code
function generateQRCode(symbol) {
    const container = document.getElementById('qrcode');
    container.innerHTML = ''; // Clear previous QR code
    
    const address = walletAddresses[symbol];
    
    qrcode = new QRCode(container, {
        text: address,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Copy address to clipboard
async function copyAddress() {
    const address = walletAddresses[currentCrypto];
    const btn = document.getElementById('copyBtnText');
    
    try {
        await navigator.clipboard.writeText(address);
        btn.textContent = 'Copied!';
        
        // Show success notification
        showNotification('Address copied to clipboard', 'success');
        
        // Reset button text after 2 seconds
        setTimeout(() => {
            btn.textContent = 'Copy Address';
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            btn.textContent = 'Copied!';
            showNotification('Address copied to clipboard', 'success');
            setTimeout(() => {
                btn.textContent = 'Copy Address';
            }, 2000);
        } catch (err) {
            showNotification('Failed to copy address', 'error');
        }
        
        document.body.removeChild(textArea);
    }
}

// Share address
async function shareAddress() {
    const address = walletAddresses[currentCrypto];
    const cryptoNames = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'USDT': 'Tether',
        'BNB': 'BNB'
    };
    
    const shareData = {
        title: `Receive ${cryptoNames[currentCrypto]}`,
        text: `Send ${cryptoNames[currentCrypto]} to this address:\n${address}`,
    };
    
    // Check if Web Share API is supported
    if (navigator.share) {
        try {
            await navigator.share(shareData);
            showNotification('Shared successfully', 'success');
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error sharing:', err);
            }
        }
    } else {
        // Fallback: copy to clipboard
        copyAddress();
        showNotification('Sharing not supported. Address copied instead!', 'success');
    }
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