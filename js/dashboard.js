

// Dashboard.js - UPDATED with Dynamic Assets
const API_URL = 'https://cost-romance-attachments-fabrics.trycloudflare.com/api';

// Check authentication
function checkDashboardAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    return token;
}

// Get auth headers
function getAuthHeaders() {
    const token = checkDashboardAuth();
    if (!token) return null;
    
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
    };
}

// Load user data
async function loadUserData() {
    const token = checkDashboardAuth();
    if (!token) return;

    try {
        const response = await fetch(API_URL + '/auth/me', {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            const user = data.user;
            
            // Update balance
            const balanceEl = document.getElementById('totalBalance');
            if (balanceEl) {
                balanceEl.textContent = '$' + user.walletBalance.toFixed(2);
            }
            
            // Update wallet address
            const addressEl = document.getElementById('walletAddress');
            if (addressEl) {
                addressEl.textContent = user.walletAddress;
            }
            
            // Store user data
            localStorage.setItem('user', JSON.stringify(user));
            
            // Load assets dynamically
            await loadUserAssets();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load user assets dynamically
async function loadUserAssets() {
    const assetsContainer = document.getElementById('assetsList');
    if (!assetsContainer) return;
    
    assetsContainer.innerHTML = '<div class="p-8 text-center text-gray-400">Loading assets...</div>';
    
    try {
        // Fetch live crypto prices
        const cryptoPrices = await fetchLivePrices();
        
        // Get user's wallet balances (mock data for demo - replace with real wallet API)
        const userBalances = getUserWalletBalances();
        
        // Filter only assets with balance > 0
        const userAssets = [];
        
        for (const [symbol, balance] of Object.entries(userBalances)) {
            if (balance > 0) {
                const crypto = getCryptoBySymbol(symbol);
                if (crypto) {
                    userAssets.push({
                        ...crypto,
                        balance: balance,
                        value: balance * (crypto.price || 0)
                    });
                }
            }
        }
        
        // Display assets
        if (userAssets.length === 0) {
            assetsContainer.innerHTML = '<div class="p-8 text-center text-gray-400">No assets yet</div>';
            
            // Hide View All button
            const viewAllBtn = document.querySelector('[data-view-all="assets"]');
            if (viewAllBtn) viewAllBtn.style.display = 'none';
        } else {
            // Show only first 3 assets
            const displayAssets = userAssets.slice(0, 3);
            
            assetsContainer.innerHTML = displayAssets.map(asset => `
                <div class="grid grid-cols-12 gap-4 p-4 border-b border-gray-700 hover:bg-gray-700 transition cursor-pointer">
                    <div class="col-span-5 flex items-center gap-3">
                        <img src="${asset.logo}" alt="${asset.name}" class="w-8 h-8 rounded-full" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22${asset.color}%22/></svg>'">
                        <div>
                            <div class="font-medium">${asset.name}</div>
                            <div class="text-sm text-gray-400">${asset.symbol}</div>
                        </div>
                    </div>
                    <div class="col-span-3 text-right">${asset.balance.toFixed(4)} ${asset.symbol}</div>
                    <div class="col-span-2 text-right">${formatPrice(asset.price)}</div>
                    <div class="col-span-2 text-right">${formatPrice(asset.value)}</div>
                </div>
            `).join('');
            
            // Show/hide View All button
            const viewAllBtn = document.querySelector('[data-view-all="assets"]');
            if (viewAllBtn) {
                viewAllBtn.style.display = userAssets.length > 3 ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('Error loading assets:', error);
        assetsContainer.innerHTML = '<div class="p-8 text-center text-red-400">Failed to load assets</div>';
    }
}

// Get user wallet balances (DEMO - Replace with real wallet connection)
function getUserWalletBalances() {
    // Check if user imported a wallet
    const importedWallet = localStorage.getItem('importedWallet');
    
    if (importedWallet) {
        // In real implementation, fetch balances from blockchain
        // For demo, return mock data
        return {
            'BTC': 0.0523,
            'ETH': 1.245,
            'USDT': 0,
            'BNB': 0
        };
    }
    
    // Default wallet (from our database)
    return {
        'BTC': 0,
        'ETH': 0,
        'USDT': 0,
        'BNB': 0
    };
}

// Logout function
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Load transactions
async function loadTransactions() {
    const txContainer = document.querySelector('#recentTransactions .bg-gray-800');
    if (!txContainer) return;
    
    try {
        const response = await fetch(API_URL + '/wallet/transactions', {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (data.success && data.transactions && data.transactions.length > 0) {
            // Display first 3 transactions
            const displayTx = data.transactions.slice(0, 3);
            
            // Implementation here...
            
            // Show/hide View All button
            const viewAllBtn = document.querySelector('[data-view-all="transactions"]');
            if (viewAllBtn) {
                viewAllBtn.style.display = data.transactions.length > 3 ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// Initialize dashboard - ONLY if not already initialized
if (!window.dashboardInitialized) {
    window.dashboardInitialized = true;
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📊 Dashboard.js loading...');
        
        // Don't redirect if no token - let index.html handle it
        const token = localStorage.getItem('token');
        if (token) {
            loadUserData();
            // Refresh prices every 60 seconds
            setInterval(loadUserAssets, 60000);
        } else {
            console.log('⚠️ No token - skipping dashboard data load');
        }
    });
}