(() => {
    'use strict';
    const providerBrands = {
        mtn: ['gh_mtn', 'ug_mtn', 'ci_mtn', 'rw_mtn', 'zm_mtn', 'cm_mtn', 'bj_mtn'],
        telecel: ['gh_telecel'], airteltigo: ['gh_airteltigo'],
        opay: ['ng_opay'], palmpay: ['ng_palmpay'], paga: ['ng_paga'], moniepoint: ['ng_moniepoint'],
        mpesa: ['ke_mpesa', 'tz_mpesa', 'cd_mpesa', 'mz_mpesa'],
        airtel: ['ke_airtel', 'ug_airtel', 'tz_airtel', 'rw_airtel', 'zm_airtel', 'cd_airtel', 'mw_airtel'],
        tkash: ['ke_tkash'], tigopesa: ['tz_tigo'], halopesa: ['tz_halopesa'],
        orange: ['sn_orange', 'ci_orange', 'cm_orange', 'cd_orange'], wave: ['sn_wave', 'ci_wave'],
        freemoney: ['sn_free'], moov: ['ci_moov', 'bj_moov', 'tg_moov'], zamtel: ['zm_zamtel'],
        tmoney: ['tg_tmoney'], tnm: ['mw_tnm'], myzaka: ['bw_myzaka'], smega: ['bw_smega'], emola: ['mz_emola'],
        paypal: ['us_paypal'], zelle: ['us_zelle'], cashapp: ['us_cashapp']
    };
    const providerNames = {
        paypal: 'paypal', skrill: 'skrill', wise: 'wise', zelle: 'zelle', 'cash app': 'cashapp',
        opay: 'opay', palmpay: 'palmpay', paga: 'paga', moniepoint: 'moniepoint',
        't-kash': 'tkash', 'tigo pesa': 'tigopesa', halopesa: 'halopesa', 'free money': 'freemoney',
        'zamtel kwacha': 'zamtel', tmoney: 'tmoney', flooz: 'moov', 'tnm mpamba': 'tnm',
        myzaka: 'myzaka', smega: 'smega', 'e-mola': 'emola'
    };
    const bankCountries = {
        GH: { 'GCB Bank': 'gcb', 'GCB Bank PLC': 'gcb', 'Ecobank Ghana': 'ecobank', Ecobank: 'ecobank', 'Absa Bank Ghana': 'absa', 'Absa Bank': 'absa', 'CAL Bank': 'calbank', CalBank: 'calbank', 'Fidelity Bank': 'fidelity' },
        NG: { 'Access Bank': 'access', GTBank: 'gtbank', 'Zenith Bank': 'zenith', UBA: 'uba', 'First Bank of Nigeria': 'firstbank', 'Fidelity Bank Nigeria': 'fidelity-ng' },
        KE: { 'KCB Bank': 'kcb', 'Equity Bank Kenya': 'equity', 'Co-operative Bank': 'coop-ke', 'NCBA Bank': 'ncba', 'Absa Bank Kenya': 'absa' },
        UG: { 'Stanbic Bank Uganda': 'standardbank', 'Centenary Bank': 'centenary', 'Absa Bank Uganda': 'absa', 'DFCU Bank': 'dfcu', 'Equity Bank Uganda': 'equity' },
        TZ: { 'NMB Bank': 'nmb', 'CRDB Bank': 'crdb', 'NBC Tanzania': 'nbc', 'Stanbic Bank Tanzania': 'standardbank', 'Equity Bank Tanzania': 'equity' },
        SN: { CBAO: 'cbao', 'Ecobank Senegal': 'ecobank', 'Banque Atlantique Senegal': 'atlantique', BICIS: 'bicis', 'SGBS Senegal': 'socgen' },
        CI: { 'NSIA Banque': 'nsia', 'Societe Generale CI': 'socgen', 'Ecobank CI': 'ecobank', 'Banque Atlantique CI': 'atlantique', BICICI: 'bicici' },
        RW: { 'Bank of Kigali': 'bk', 'I&M Bank Rwanda': 'im-bank', 'Equity Bank Rwanda': 'equity', Cogebanque: 'cogebanque', 'Ecobank Rwanda': 'ecobank' },
        ZM: { Zanaco: 'zanaco', 'Stanbic Bank Zambia': 'standardbank', 'Absa Bank Zambia': 'absa', 'First National Bank Zambia': 'fnb', 'Atlas Mara Zambia': 'atlasmara' },
        CM: { 'Afriland First Bank': 'afriland', 'Ecobank Cameroon': 'ecobank', 'UBA Cameroon': 'uba', 'Societe Generale Cameroun': 'socgen', 'Banque Atlantique Cameroun': 'atlantique' },
        BJ: { 'Ecobank Benin': 'ecobank', 'Bank of Africa Benin': 'boa', 'Orabank Benin': 'orabank', 'UBA Benin': 'uba', 'Coris Bank Benin': 'coris' },
        TG: { 'Ecobank Togo': 'ecobank', 'Orabank Togo': 'orabank', 'UTB Togo': 'utb', 'Banque Atlantique Togo': 'atlantique', 'Coris Bank Togo': 'coris' },
        CD: { Rawbank: 'rawbank', 'Equity BCDC': 'equity', 'Ecobank DRC': 'ecobank', 'Trust Merchant Bank': 'tmb', 'UBA DRC': 'uba' },
        MW: { 'National Bank of Malawi': 'nbm', 'Standard Bank Malawi': 'standardbank', 'FDH Bank': 'fdh', 'NBS Bank': 'nbs', 'Ecobank Malawi': 'ecobank' },
        BW: { 'First National Bank Botswana': 'fnb', 'Stanbic Bank Botswana': 'standardbank', 'Absa Bank Botswana': 'absa', 'BancABC Botswana': 'bancabc', 'Bank Gaborone': 'gaborone' },
        ZA: { 'Standard Bank': 'standardbank', 'First National Bank': 'fnb', ABSA: 'absa', Nedbank: 'nedbank', 'Capitec Bank': 'capitec', 'Discovery Bank': 'discovery' },
        ET: { 'Commercial Bank of Ethiopia': 'cbe', 'Awash Bank': 'awash', 'Dashen Bank': 'dashen', 'Bank of Abyssinia': 'abyssinia', 'Cooperative Bank of Oromia': 'coop-et' },
        EG: { 'National Bank of Egypt': 'nbe', 'Banque Misr': 'misr', 'CIB Egypt': 'cib', 'QNB Al Ahli': 'qnb', AlexBank: 'alexbank' },
        MA: { 'Attijariwafa Bank': 'attijariwafa', 'Banque Populaire': 'bcp', 'BMCE Bank': 'bmce', 'CIH Bank': 'cih', 'Credit du Maroc': 'cdm' },
        DZ: { "Banque Nationale d'Algerie": 'bna', "Credit Populaire d'Algerie": 'cpa', BADR: 'badr', 'Societe Generale Algerie': 'socgen', 'BNP Paribas El Djazair': 'bnp' },
        AO: { 'Banco de Fomento Angola': 'bfa', 'Banco BIC': 'bic', 'Banco Atlantico': 'atlantico', 'Banco Sol': 'sol', 'Standard Bank Angola': 'standardbank' },
        MZ: { 'Millennium BIM': 'bim', BCI: 'bci', 'Standard Bank Mozambique': 'standardbank', 'Absa Bank Mozambique': 'absa', 'Moza Banco': 'moza' },
        US: { 'Bank of America': 'bankofamerica', Chase: 'chase', 'Wells Fargo': 'wellsfargo', Citibank: 'citi', 'Capital One': 'capitalone', 'Navy Federal Credit Union': 'navyfederal' }
    };
    const normalize = name => String(name || '').trim().toLowerCase();
    const local = brand => brand ? 'assets/providers/' + brand + '.png' : '';
    const ids = new Map(Object.entries(providerBrands).flatMap(([brand, providers]) => providers.map(id => [id, brand])));
    const banks = new Map(Object.entries(bankCountries).map(([country, names]) => [country, new Map(Object.entries(names).map(([name, brand]) => [normalize(name), brand]))]));
    function providerLogo(provider) {
        if (!provider) return '';
        const name = normalize(provider.name);
        let brand = ids.get(provider.id) || providerNames[name];
        // Legacy transactions may contain a display name without a provider ID.
        if (!brand) {
            for (const [pattern, key] of [[/^mtn\b/, 'mtn'], [/^telecel\b/, 'telecel'], [/^airtel\s*tigo\b/, 'airteltigo'], [/^airtel money\b/, 'airtel'], [/^m-pesa\b/, 'mpesa'], [/^orange money\b/, 'orange'], [/^wave\b/, 'wave'], [/^moov money\b/, 'moov']]) {
                if (pattern.test(name)) { brand = key; break; }
            }
        }
        return local(brand);
    }
    function bankLogo(name, countryCode) {
        if (normalize(name) === 'wise bank transfer') return local('wise');
        return local(banks.get(String(countryCode || '').toUpperCase())?.get(normalize(name)));
    }
    const coins = new Set(['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE']);
    function withdrawalLogo(tx) {
        const details = tx.details || {};
        if (tx.method === 'momo') {
            const name = tx.carrierName || details.carrierName || String(tx.displayName || '').split(' - ')[0] || 'Mobile money';
            return { url: providerLogo({ id: tx.carrier || details.carrier, name }), label: name, fallback: 'smartphone' };
        }
        if (tx.method === 'bank') {
            const rail = tx.payoutRail || details.payoutRail;
            const name = rail === 'paypal' ? 'PayPal' : rail === 'zelle' ? 'Zelle' : tx.bankName || details.bank || tx.payoutRailLabel || details.payoutRailLabel || String(tx.displayName || '').split(' - ')[0] || 'Bank transfer';
            return { url: bankLogo(name, tx.countryCode || details.countryCode) || providerLogo({ name }), label: name, fallback: 'home' };
        }
        const symbol = String(tx.cryptocurrency || tx.symbol || details.crypto || '').toUpperCase();
        return { url: coins.has(symbol) ? 'assets/crypto/' + symbol.toLowerCase() + '.svg' : '', label: symbol || 'Crypto', fallback: 'repeat' };
    }
    window.CVPaymentLogos = { providerLogo, bankLogo, withdrawalLogo };
})();
