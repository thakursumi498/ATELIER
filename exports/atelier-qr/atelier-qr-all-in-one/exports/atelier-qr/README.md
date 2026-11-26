# ATELIER QR exports

Destination encoded directly in all QR codes: https://www.atelierwallstory.com/

Detected brand palette: crimson #9B1C1C · warmBeige #E8E2D9 · offWhite #FAF9F6 · charcoal #1A1A1A

Each QR uses high error correction (H), a four-module quiet zone, the original cropped Atelier logo PNG embedded at the centre, and brand-derived colors. SVGs contain the logo image as an embedded data URI. PDFs are square, 6-inch print files with vector QR modules and the embedded original PNG logo.

Regenerate from the repository root with `npm run generate:qr`. Override the destination with `npm run generate:qr -- --url=https://your-live-domain.example/`. The script also accepts `--logo=public/brand/atelier-logo-primary.png`, `--out=exports/atelier-qr`, `--logoWidthRatio=0.2`, `--resolutions=1024,2048,4096`, and `--formats=png,svg,pdf`.

For physical QA, print at intended size. On Android, open the Camera or Google Lens and scan from a normal viewing distance. On iPhone, open Camera and point it at the print, then tap the website banner. Confirm both phones open the destination above. Recheck each paper stock, finish, and lighting condition used in production.

See `validation-report.json` for the ZXing decode results for every PNG size, rendered SVG, and rendered PDF.
