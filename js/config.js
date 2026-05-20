// js/config.js - Centralized API Configuration
// Place this file in your frontend/js/ folder

const CONFIG = {
  API_URLS: [
    'https://api.coinvaultnet.com/api',
    'https://coinvault-backend-production.up.railway.app/api'
  ],
  get API_URL() {
    return this.API_URLS[0];
  },
  
  // Network Configuration
  NETWORK: 'bitcoin', // 'bitcoin' or 'testnet'
  
  // API Headers
  getHeaders: function(includeAuth = false) {
    const headers = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    };
    
    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return headers;
  },
  
  // Make API Request Helper
  async apiRequest(endpoint, options = {}) {
    const includeAuth = options.auth !== false; // Default to true
    
    const config = {
      method: options.method || 'GET',
      headers: this.getHeaders(includeAuth),
      mode: 'cors',
      credentials: 'omit',
      ...options
    };
    
    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    let lastError = null;

    for (const baseUrl of this.API_URLS) {
      const url = `${baseUrl}${endpoint}`;

      try {
        console.log(`API Request: ${config.method} ${url}`);

        const response = await fetch(url, config);

        console.log(`Response Status: ${response.status}`);

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Request failed with status ${response.status}`);
        }

        console.log('API Success:', data);
        return data;
      } catch (error) {
        lastError = error;
        console.warn(`API host failed (${baseUrl}):`, error.message);

        const networkFailure =
          error.message.includes('NetworkError') ||
          error.message.includes('fetch') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('non-JSON response');

        if (!networkFailure) {
          throw error;
        }
      }
    }

    console.error('API Request Error:', lastError);
    throw new Error('Cannot connect to server. Please check your internet connection.');
  },
  
  // Format Bitcoin Address for Display
  formatAddress(address) {
    if (!address) return 'Not Connected';
    if (address.length <= 20) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  },
  
  // Validate Bitcoin Address
  isValidBitcoinAddress(address) {
    // Basic Bitcoin address validation
    // Mainnet: starts with 1, 3, or bc1
    // Testnet: starts with m, n, or tb1
    const mainnetRegex = /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/;
    const testnetRegex = /^(m|n|tb1)[a-zA-HJ-NP-Z0-9]{25,62}$/;
    
    return mainnetRegex.test(address) || testnetRegex.test(address);
  },
  
  // Format crypto amount
  formatCrypto(amount, decimals = 8) {
    return parseFloat(amount).toFixed(decimals);
  },
  
  // Format USD amount
  formatUSD(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
