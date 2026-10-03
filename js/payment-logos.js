(() => {
    'use strict';
    const localProviders = {
        gh_mtn: 'mtn.png', gh_telecel: 'telecel.png', gh_airteltigo: 'airteltigo.png'
    };
    const domains = {
        gh_mtn: 'mtn.com', gh_telecel: 'telecel.com.gh', gh_airteltigo: 'airteltigo.com.gh',
        ng_opay: 'opayweb.com', ng_palmpay: 'palmpay.com', ng_paga: 'mypaga.com', ng_moniepoint: 'moniepoint.com',
        ke_mpesa: 'safaricom.co.ke', ke_airtel: 'airtelkenya.com', ke_tkash: 'telkom.co.ke',
        ug_mtn: 'mtn.co.ug', ug_airtel: 'airtel.co.ug',
        tz_mpesa: 'vodacom.co.tz', tz_airtel: 'airtel.co.tz', tz_tigo: 'yas.co.tz', tz_halopesa: 'halotel.co.tz',
        sn_orange: 'orange.sn', sn_wave: 'wave.com', sn_free: 'free.sn',
        ci_orange: 'orange.ci', ci_mtn: 'mtn.ci', ci_moov: 'moov-africa.ci', ci_wave: 'wave.com',
        rw_mtn: 'mtn.co.rw', rw_airtel: 'airtel.co.rw',
        zm_airtel: 'airtel.co.zm', zm_mtn: 'mtn.zm', zm_zamtel: 'zamtel.zm',
        cm_mtn: 'mtn.cm', cm_orange: 'orange.cm', bj_mtn: 'mtn.bj', bj_moov: 'moov-africa.bj',
        tg_tmoney: 'togocom.tg', tg_moov: 'moov-africa.tg',
        cd_mpesa: 'vodacom.cd', cd_airtel: 'airtel.cd', cd_orange: 'orange.cd',
        mw_airtel: 'airtel.mw', mw_tnm: 'tnm.co.mw', bw_myzaka: 'mascom.bw', bw_smega: 'btc.bw',
        mz_mpesa: 'vm.co.mz', mz_emola: 'movitel.co.mz',
        us_paypal: 'paypal.com', us_zelle: 'zellepay.com', us_cashapp: 'cash.app'
    };
    const nameDomains = { paypal: 'paypal.com', skrill: 'skrill.com', wise: 'wise.com', zelle: 'zellepay.com', 'cash app': 'cash.app' };
    const coins = new Set(['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE']);
    const ghanaBanks = {
        'gcb bank': 'gcb.png', 'gcb bank plc': 'gcb.png',
        ecobank: 'ecobank.png', 'ecobank ghana': 'ecobank.png',
        'absa bank ghana': 'absa.png', 'absa bank': 'absa.png',
        'cal bank': 'calbank.png', calbank: 'calbank.png', 'fidelity bank': 'fidelity.png'
    };
    function providerLogo(provider) {
        if (!provider) return '';
        const name = String(provider.name || '').trim().toLowerCase();
        let local = localProviders[provider.id];
        // Older history responses contain the display name but no provider ID.
        if (!local && /^(mtn\b|telecel\b|airtel\s*tigo\b)/.test(name)) {
            local = name.startsWith('mtn') ? 'mtn.png' : name.startsWith('telecel') ? 'telecel.png' : 'airteltigo.png';
        }
        if (local) return 'assets/providers/' + local;
        const domain = provider.logoDomain || domains[provider.id] || nameDomains[name];
        return domain ? 'https://www.google.com/s2/favicons?sz=128&domain=' + encodeURIComponent(domain) : '';
    }
    function withdrawalLogo(tx) {
        const details = tx.details || {};
        if (tx.method === 'momo') {
            const name = tx.carrierName || details.carrierName || String(tx.displayName || '').split(' - ')[0] || 'Mobile money';
            return { url: providerLogo({ id: tx.carrier || details.carrier, name }), label: name, fallback: 'smartphone' };
        }
        if (tx.method === 'bank') {
            const name = tx.bankName || details.bank || tx.payoutRailLabel || details.payoutRailLabel || String(tx.displayName || '').split(' - ')[0] || 'Bank transfer';
            const local = tx.countryCode === 'GH' ? ghanaBanks[String(name).trim().toLowerCase()] : null;
            return { url: local ? 'assets/providers/' + local : providerLogo({ name }), label: name, fallback: 'home' };
        }
        const symbol = String(tx.cryptocurrency || tx.symbol || details.crypto || '').toUpperCase();
        return { url: coins.has(symbol) ? 'assets/crypto/' + symbol.toLowerCase() + '.svg' : '', label: symbol || 'Crypto', fallback: 'repeat' };
    }
    window.CVPaymentLogos = { providerLogo, withdrawalLogo };
})();
