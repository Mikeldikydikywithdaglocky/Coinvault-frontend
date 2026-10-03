(() => {
    'use strict';
    const page = location.pathname.split('/').pop();
    function hydrate() {
        const state = CVAccount.state;
        const assets = !state.loaded || state.error ? [] : CVAccount.currentWallets().flatMap(wallet => wallet.assets || []);
        if (page === 'send.html' && typeof cryptos !== 'undefined') {
            for (const crypto of cryptos) {
                const owned = assets.filter(asset => asset.symbol === crypto.symbol);
                crypto.balance = owned.reduce((sum,asset) => sum + Number(asset.balance),0);
                crypto.price = state.quotes[crypto.symbol] || Number(owned[0]?.price) || 0;
                crypto.image = `assets/crypto/${crypto.symbol.toLowerCase()}.svg`;
            }
            renderCryptoList(); selectCrypto(selectedCrypto.symbol);
        }
        if (page === 'swap.html' && typeof userBalances !== 'undefined') {
            for (const symbol of Object.keys(userBalances)) userBalances[symbol] = 0;
            for (const asset of assets) userBalances[asset.symbol] = (userBalances[asset.symbol] || 0) + Number(asset.balance);
            for (const token of popularTokens) token.price = state.quotes[token.symbol] || Number(assets.find(asset => asset.symbol === token.symbol)?.price) || 0;
            updateBalances(); calculateSwap();
        }
        if (page === 'sell.html') { const symbol = document.getElementById('sellCrypto').value.split('|')[0]; updateSellBalances(); const option = [...document.getElementById('sellCrypto').options].find(option => option.value.startsWith(symbol + '|')); if (option) option.selected = true; calculateSell(); }
        CVAccount.icons();
    }
    document.addEventListener('cv:data',hydrate); document.addEventListener('cv:walletchange',hydrate); document.addEventListener('cv:quotes',hydrate);
    document.addEventListener('DOMContentLoaded', () => {
        if (page === 'nfts.html') {
            const main = document.querySelector('body>main');
            const content = main.querySelector('.max-w-2xl');
            if (content) content.innerHTML = `<h1 style="text-align:left;margin:24px 0">NFTs</h1><section class="cv-empty"><p>NFT trading is not available yet.</p><a class="cv-button" href="index.html">${CVAccount.icon('arrow-left')}Return to wallet</a></section>`;
        }
        if (page === 'receive.html') {
            const root = document.querySelector('body>main>.max-w-2xl');
            root?.lastElementChild?.remove();
            const select = document.createElement('select'); select.id = 'cvReceiveWallet'; select.setAttribute('aria-label','Receiving wallet'); select.className = 'cv-mobile-selector'; select.style.display = 'block'; select.style.marginBottom = '18px'; root?.querySelector('.mb-8')?.after(select);
            const update = () => { select.replaceChildren(); for (const wallet of CVAccount.state.wallets) { const option = document.createElement('option'); option.value = wallet.address; option.textContent = `${wallet.label} - ${CVAccount.short(wallet.address)}`; select.append(option); } select.disabled = !CVAccount.state.wallets.length; select.value = CVAccount.currentWallets()[0]?.address || ''; };
            document.addEventListener('cv:data',update); select.onchange = () => CVAccount.select(select.value); update();
        }
        if (CVAccount.state.loaded) hydrate();
    });
})();
