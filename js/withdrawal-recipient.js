(() => {
    'use strict';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    function field(provider) {
        const name = String(provider?.name || 'Recipient');
        if (provider?.inputType === 'email') return { type: 'email', inputMode: 'email', maxLength: 254, label: name + ' Email', placeholder: 'you@example.com', error: 'Enter a valid ' + name + ' email address.' };
        if (provider?.id === 'us_zelle' || name === 'Zelle') return { type: 'text', inputMode: 'text', maxLength: 254, label: 'Zelle Email or US Mobile Number', placeholder: 'Email or US mobile number', error: 'Enter your enrolled Zelle email or a valid US mobile number.' };
        if (provider?.id === 'us_cashapp' || name === 'Cash App') return { type: 'text', inputMode: 'text', maxLength: 21, label: 'Cash App $Cashtag', placeholder: '$YourCashtag', error: 'Enter a valid $Cashtag with at least one letter and no more than 20 letters or digits.' };
        if (provider?.prefixes?.length) return { type: 'tel', inputMode: 'tel', maxLength: (provider.maxLength || 16) + 8, label: name + ' Number', placeholder: 'Enter recipient number', error: 'Enter a valid ' + name + ' number. Expected prefixes: ' + provider.prefixes.join(', ') };
        return { type: 'text', inputMode: 'text', maxLength: provider?.maxLength || 80, label: name + ' Account', placeholder: 'Enter recipient account', error: 'Enter a valid ' + name + ' account.' };
    }
    function validate(provider, raw) {
        const value = String(raw || '').trim();
        const settings = field(provider);
        let normalized = value, valid = false;
        if (provider && value) {
            if (settings.type === 'email') {
                valid = value.length <= settings.maxLength && emailPattern.test(value);
            } else if (provider.id === 'us_zelle' || provider.name === 'Zelle') {
                if (value.includes('@')) valid = value.length <= settings.maxLength && emailPattern.test(value);
                else {
                    const digits = value.replace(/[\s()+.-]/g, '');
                    valid = /^(?:1)?[2-9]\d{2}[2-9]\d{6}$/.test(digits);
                    if (valid) normalized = digits.length === 11 ? '+' + digits : digits;
                }
            } else if (provider.id === 'us_cashapp' || provider.name === 'Cash App') {
                const tag = value.replace(/^\$/, '');
                valid = /^(?=.*[a-z])[a-z\d]{1,20}$/i.test(tag);
                if (valid) normalized = '$' + tag;
            } else if (provider.prefixes?.length) {
                normalized = value.replace(/[\s()+.-]/g, '');
                valid = /^\d+$/.test(normalized) && normalized.length >= (provider.minLength || 8) && normalized.length <= (provider.maxLength || 16) && provider.prefixes.some(prefix => normalized.startsWith(prefix));
            } else {
                valid = value.length >= (provider.minLength || 3) && value.length <= settings.maxLength && !/[\x00-\x1f\x7f]/.test(value);
            }
        }
        return { value: normalized, valid, empty: !value, error: settings.error };
    }
    window.CVWithdrawalRecipient = { field, validate };
})();
