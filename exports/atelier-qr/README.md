# ATELIER QR exports

Destination encoded directly in all three static QR codes: https://www.atelierwallstory.com/

Detected brand palette: crimson #9B1C1C · warmBeige #E8E2D9 · offWhite #FAF9F6 · charcoal #1A1A1A
Brand name: ATELIER — WALL STORY
Variant 03 logo: public/brand/atelier-logo-black.png (monochrome, original supplied asset)

The folders are `01-classic`, `02-website-theme`, and `03-premium-branded`. Each contains 1024, 2048, and 4096 PNGs, an SVG, and a six-inch PDF. All output colors are neutral—no red is used in any variant. All QR matrices use error correction H and a four-module quiet zone. The Premium Branded version places the monochrome original logo in the centre and the complete brand name below the QR, outside its quiet zone.

Regenerate the three variants and the ZIP with `npm run generate:qr`. Override the destination with `npm run generate:qr -- --url=https://your-live-domain.example/`. Other options include `--logo=public/brand/atelier-logo-black.png`, `--out=exports/atelier-qr`, `--logoWidthRatio=0.2`, `--resolutions=1024,2048,4096`, and `--formats=png,svg,pdf`.

Physical scan check before printing: on Android, use Camera or Google Lens. On iPhone, use Camera and tap the website banner. Check each intended print size, material, finish, lighting condition, and normal viewing distance. Confirm both phones open the destination above.

See `validation-report.json` for the ZXing decode results for every PNG size, rendered SVG, and rendered PDF.
