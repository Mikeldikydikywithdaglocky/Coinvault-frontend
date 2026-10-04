# Payment Brand Assets

These local PNGs identify the providers and named banks already configured in
CoinVault. `../../js/payment-logos.js` maps provider IDs and country-specific bank
names to files. Logos are served locally; browsers do not contact a favicon
service or a brand website to render them.

`logo-sources.json` lists reference websites, published artwork sources where
known, and conversion notes. Existing Ghana assets were retained unchanged.
Website references are not claims of an original download URL or a reuse license.

## Credits

- `equity.png`: Equity Bank, [Equity Group Logo](https://commons.wikimedia.org/wiki/File:Equity_Group_Logo.png), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Resized to PNG; this asset remains under that license.
- `bancabc.png`: BancABC, [BancABC Logo](https://commons.wikimedia.org/wiki/File:BancABC_Logo.png), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Resized to PNG; this asset remains under that license.
- `navyfederal.png`: Mawillcockson, [Navy Federal Credit Union Logo](https://commons.wikimedia.org/wiki/File:Navy_Federal_Credit_Union_Logo.svg), [CC0](https://creativecommons.org/publicdomain/zero/1.0/). SVG rendered as PNG.

Other corporate artwork retains its original rights and trademark protections.
File-specific source pages should be consulted before redistribution. Images
were encoded or resized for small UI marks without redesigning their artwork.
Cogebanque, BICIS, Tigo Pesa, TMoney, and Free Money keep the identities used by
the existing configuration; this update does not rename or expand payment rails.

Displaying a logo does not establish a partnership, country eligibility, payment
integration, or successful settlement. Availability must be verified separately.
Generic transfer choices have a neutral bank icon, never a fabricated brand logo.

When adding a provider or bank, add its approved asset, provenance entry, and
country-scoped mapping together. Retain attribution when replacing an asset.
