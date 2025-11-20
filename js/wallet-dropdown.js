// js/wallet-dropdown.js
// Handles the Import Wallet dropdown menu

// Track if outside click listener is attached
let dropdownOutsideClickAttached = false;

// Handle clicks outside the dropdown
function handleOutsideClick(event) {
    const menu = document.getElementById('connectionMenu');
    const button = document.getElementById('connectionBtn');
    
    if (menu && button && !menu.contains(event.target) && !button.contains(event.target)) {
        menu.classList.add('dropdown-hidden');
        document.removeEventListener('click', handleOutsideClick);
        dropdownOutsideClickAttached = false;
        console.log('🔽 Dropdown closed (outside click)');
    }
}

// Toggle the dropdown menu
function toggleConnectionMenu(event) {
    event.stopPropagation(); // Prevent immediate outside click
    
    const menu = document.getElementById('connectionMenu');
    if (!menu) {
        console.error('❌ Connection menu not found');
        return;
    }
    
    const isHidden = menu.classList.contains('dropdown-hidden');
    
    if (isHidden) {
        // Opening dropdown
        menu.classList.remove('dropdown-hidden');
        console.log('🔼 Dropdown opened');
        
        // Add outside click listener after a small delay
        if (!dropdownOutsideClickAttached) {
            setTimeout(() => {
                document.addEventListener('click', handleOutsideClick);
                dropdownOutsideClickAttached = true;
            }, 10);
        }
    } else {
        // Closing dropdown
        menu.classList.add('dropdown-hidden');
        console.log('🔽 Dropdown closed');
        
        // Remove outside click listener
        if (dropdownOutsideClickAttached) {
            document.removeEventListener('click', handleOutsideClick);
            dropdownOutsideClickAttached = false;
        }
    }
}

console.log('✅ wallet-dropdown.js loaded');
```

---

## **VISUAL SUMMARY - What You're Doing:**

**BEFORE:**
```
index.html
├── Contains toggleConnectionMenu() ❌
├── Contains handleOutsideClick() ❌
└── Multiple DOMContentLoaded listeners ❌
```

**AFTER:**
```
wallet-dropdown.js (NEW FILE)
├── Contains toggleConnectionMenu() ✅
└── Contains handleOutsideClick() ✅

index.html
├── Loads wallet-dropdown.js first ✅
├── Clean DOMContentLoaded (single, organized) ✅
└── Only contains wallet connection logic ✅
```

---

## **STEP 4: Test Your Changes**

1. **Save all files**
2. **Clear browser cache** (Ctrl + Shift + Delete → Clear cache)
3. **Reload page** (Ctrl + F5)
4. **Open Console** (F12)
5. **You should see:**
```
   ✅ wallet-dropdown.js loaded
   CoinVault app loaded successfully!
   🚀 CoinVault Dashboard Initializing...
   ✅ Dropdown button initialized
   ⚠️ No token found - running in DEMO mode
   ✅ Dashboard initialization complete