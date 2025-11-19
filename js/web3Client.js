// web3Client.js - Frontend Web3 operations
const web3Client = {
  web3: null,
  
  init() {
    this.web3 = new Web3('https://mainnet.infura.io/v3/YOUR_PROJECT_ID');
  },
  
  // Client-side encryption (first layer)
  encryptWithPassword(data, password) {
    return CryptoJS.AES.encrypt(data, password).toString();
  },
  
  // Client-side decryption
  decryptWithPassword(encryptedData, password) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  },
  
  // Create new wallet
  async createWallet(userPassword) {
    try {
      // Generate wallet on client
      const account = this.web3.eth.accounts.create();
      
      // Encrypt private key with user password (first layer)
      const clientEncryptedPrivateKey = this.encryptWithPassword(
        account.privateKey,
        userPassword
      );
      
      // For mnemonic support, use bip39 library
      // const mnemonic = bip39.generateMnemonic();
      // const clientEncryptedMnemonic = this.encryptWithPassword(mnemonic, userPassword);
      
      // Send to backend for server-side encryption
      const response = await fetch('http://localhost:5000/api/wallet/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          walletAddress: account.address,
          clientEncryptedPrivateKey: clientEncryptedPrivateKey,
          clientEncryptedMnemonic: '' // Add mnemonic support if needed
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          address: account.address,
          // IMPORTANT: Show mnemonic ONCE to user for backup
          mnemonic: null // or actual mnemonic if generated
        };
      }
      
      return { success: false, message: data.message };
    } catch (error) {
      console.error('Create wallet error:', error);
      return { success: false, message: 'Failed to create wallet' };
    }
  },
  
  // Import wallet (full or watch-only)
  async importWallet(addressOrPrivateKey, userPassword) {
    try {
      let address, clientEncryptedPrivateKey;
      
      // Check if private key or just address
      if (addressOrPrivateKey.length === 66 || addressOrPrivateKey.length === 64) {
        // Full import with private key
        const account = this.web3.eth.accounts.privateKeyToAccount(addressOrPrivateKey);
        address = account.address;
        clientEncryptedPrivateKey = this.encryptWithPassword(
          account.privateKey,
          userPassword
        );
      } else {
        // Watch-only import (just address)
        address = addressOrPrivateKey;
        clientEncryptedPrivateKey = null;
      }
      
      const response = await fetch('http://localhost:5000/api/wallet/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          walletAddress: address,
          clientEncryptedPrivateKey: clientEncryptedPrivateKey
        })
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Import wallet error:', error);
      return { success: false, message: 'Failed to import wallet' };
    }
  },
  
  // Send transaction
  async sendTransaction(fromAddress, toAddress, amount, userPassword) {
    try {
      // 1. Request encrypted private key from backend
      const keyResponse = await fetch('http://localhost:5000/api/wallet/request-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ walletAddress: fromAddress })
      });
      
      const keyData = await keyResponse.json();
      
      // Check for watch-only error
      if (!keyData.success) {
        return {
          success: false,
          message: keyData.error || 'Transaction failed'
        };
      }
      
      // 2. Decrypt with user password (remove client encryption layer)
      const privateKey = this.decryptWithPassword(
        keyData.clientEncryptedPrivateKey,
        userPassword
      );
      
      if (!privateKey) {
        return { success: false, message: 'Invalid password' };
      }
      
      // 3. Get transaction parameters
      const [nonce, gasPrice, gasLimit] = await Promise.all([
        this.web3.eth.getTransactionCount(fromAddress),
        this.web3.eth.getGasPrice(),
        this.web3.eth.estimateGas({
          from: fromAddress,
          to: toAddress,
          value: this.web3.utils.toWei(amount.toString(), 'ether')
        })
      ]);
      
      // 4. Build transaction
      const tx = {
        from: fromAddress,
        to: toAddress,
        value: this.web3.utils.toWei(amount.toString(), 'ether'),
        gas: gasLimit,
        gasPrice: gasPrice,
        nonce: nonce
      };
      
      // 5. Sign transaction
      const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
      
      // 6. Broadcast via backend
      const broadcastResponse = await fetch('http://localhost:5000/api/wallet/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({
          signedTransaction: signedTx.rawTransaction
        })
      });
      
      const result = await broadcastResponse.json();
      return result;
    } catch (error) {
      console.error('Send transaction error:', error);
      return { success: false, message: error.message };
    }
  },
  
  // Get balance
  async getBalance(address) {
    try {
      const response = await fetch(`http://localhost:5000/api/wallet/balance/${address}`, {
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
      });
      const data = await response.json();
      return data.success ? data.balance : 0;
    } catch (error) {
      console.error('Get balance error:', error);
      return 0;
    }
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  web3Client.init();
});