// Addresses and QR codes are sourced only from the authenticated account.
let currentCrypto = 'BTC';
let receiveAddress = '';
function updateReceiveAddress() {
    const A = window.CVAccount;
    if (!A) return;
    const wallet = A.currentWallets()[0];
    receiveAddress = A.state.loaded && !A.state.error && currentCrypto === 'BTC' ? wallet?.address || '' : '';
    document.getElementById('walletAddress').textContent = receiveAddress || (A.state.error ? 'Address unavailable. Please try again.' : currentCrypto !== 'BTC' ? 'No wallet connected for this network.' : 'Connect a Bitcoin wallet to receive.');
    const container = document.getElementById('qrcode'); container.replaceChildren();
    container.parentElement.hidden = !receiveAddress;
    if (receiveAddress && window.QRCode) new QRCode(container, { text: receiveAddress, width: 200, height: 200, colorDark: '#111827', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
    document.querySelectorAll('button[onclick="copyAddress()"],button[onclick="shareAddress()"]').forEach(button => button.disabled = !receiveAddress);
}
function selectCrypto(symbol, name) {
    currentCrypto = symbol;
    document.querySelectorAll('.crypto-btn').forEach(button => { const active = button.dataset.crypto === symbol; button.classList.toggle('active', active); button.classList.toggle('ring-2', active); button.classList.toggle('ring-indigo-500', active); button.setAttribute('aria-pressed', String(active)); });
    document.getElementById('currentCryptoName').textContent = name;
    document.getElementById('currentCryptoImg').src = `assets/crypto/${symbol.toLowerCase()}.svg`;
    document.getElementById('warningCrypto').textContent = `${name} (${symbol})`;
    document.getElementById('copyBtnText').textContent = 'Copy Address'; updateReceiveAddress();
}
async function copyAddress() {
    if (!receiveAddress) return;
    await window.CVAccount.copy(receiveAddress);
}
async function shareAddress() {
    if (!receiveAddress) return;
    if (!navigator.share) return copyAddress();
    try { await navigator.share({ title: 'Receive Bitcoin', text: `Bitcoin (BTC) address: ${receiveAddress}` }); }
    catch (error) { if (error.name !== 'AbortError') window.CVAccount.toast('Unable to share this address.'); }
}
document.addEventListener('cv:data', updateReceiveAddress);
document.addEventListener('cv:walletchange', updateReceiveAddress);
document.addEventListener('DOMContentLoaded', updateReceiveAddress);
