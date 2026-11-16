# Roster worker dependencies

The pinned PDF, ZIP and font files run in the Roster worker. The existing application also reuses this local SheetJS 0.18.5 file for its XLSX global, replacing a duplicate CDN request without changing parser bytes or version. No build step or file upload service is required. Trip Check keeps its own deferred PDF implementation.

| File | Version / origin | License |
| --- | --- | --- |
| `xlsx.full.min.js` | SheetJS CE 0.18.5, matching the existing app parser; cdnjs official package distribution | Apache 2.0; `LICENSE.sheetjs` |
| `jspdf.umd.min.js` | jsPDF 3.0.4; jsDelivr npm distribution | MIT; `LICENSE.jspdf` |
| `jszip.min.js` | JSZip 3.10.1; jsDelivr npm distribution | MIT/GPLv3 choice and bundled notices; `LICENSE.jszip` |
| `DejaVuSansCondensed.ttf`, `DejaVuSansCondensed-Bold.ttf` | Installed DejaVu fonts (`/usr/share/fonts/truetype/dejavu/`); embedded/subset for source proper names | Bitstream Vera/DejaVu notices and font embedding rights; `LICENSE.fonts` |

The worker uses relative same-origin URLs. Each workbook is bounded and validated; formula cells are not evaluated. Font glyph failures are reported rather than silently replacing source characters. No private reference image, workbook, driver record, generated personal document or secret is included here. Trailing whitespace in text distributions/notices is normalized without changing executable code or license wording. `SHA256SUMS` records the distributed dependency bytes.
