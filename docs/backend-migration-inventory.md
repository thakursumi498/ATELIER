# ATELIER backend and image migration inventory

Created: 2026-11-24. This is the pre-change inventory for the static-content and Cloudinary migration.

## Preservation and scope

- A private, local Atlas export was written before implementation to `.local-migration-backups/atlas-2026-11-24T18-08-40-658Z/`. Its directory is ignored by Git and has owner-only permissions. It contains all current non-system collections, including enquiry and session data. The manifest records collection counts.
- No Atlas records, Cloudinary assets, or local source images have been deleted.
- Existing uncommitted changes to the enquiry-email workflow and `AboutStudioHero` are pre-existing work and must be retained.
- Customer acknowledgement email remains disabled; enquiry notifications go to the studio owner only.

## Atlas snapshot

Database `atelier` contained 11 collections at audit time:

| Collection | Records |
| --- | ---: |
| `admin_sessions` | 2 |
| `audit_logs` | 3 |
| `blogs` | 0 |
| `categories` | 0 |
| `content_versions` | 2 |
| `designs` | 0 |
| `enquiries` | 3 |
| `pages` | 1 |
| `projects` | 0 |
| `rate_limits` | 0 |
| `site_settings` | 0 |

The `pages` record is the only active CMS page override. Its contact hero copy is “Let’s Create Something Remarkable.” and “Tell us about your space, surface, your ideas, and the wall story you want to create. Our Mumbai studio will get in touch with you soon.” Its calls to action are “Start a Project Enquiry” (`#enquiry-form`) and “WhatsApp Our Studio” (`https://wa.me/918017463132`). Preserve this content in the frontend static configuration. CMS pages, revisions, sessions, audit history and historical enquiries remain in Atlas and in the private local export.

## Image snapshot

- `public/` contains 247 image-like files, approximately 48,803,228 bytes total. This includes brand/interface files and assets that are not used by the public site.
- Static-source scanning found 219 unique literal local image references: 208 `/images` references (41,110,450 bytes of source files), 4 `/samples` SVG references (10,184 bytes), and 7 `/brand` references (3,401,990 bytes).
- 28 local image-like files were not found in those literal source references (approximately 4,280,604 bytes). They are excluded from upload until runtime scanning proves they are used.
- The design catalogue contains 40 identified category artworks: CAT-01: 1; CAT-02: 4; CAT-03: 0; CAT-04: 0; CAT-05: 11; CAT-06: 7 (hidden/retired); CAT-07: 4; CAT-08: 7; CAT-09: 0; CAT-10: 0; CAT-11: 0; CAT-12: 0; CAT-13: 6. Public catalogue categories exclude CAT-06.
- Current Cloudinary account is on its Free plan and has 60 image assets and 4 sample videos already present; these assets are not part of this migration and will not be deleted. Usage endpoint showed 0 credits used out of 25 at the last read; this is a provider snapshot, not a future usage guarantee.
- Existing Cloudinary configuration is present in local environment files. Only server-side Cloudinary credentials may be used. Their values are intentionally omitted from this report.

## Current application dependencies

- Public pages use `src/lib/public-cms.ts`, which queries Atlas and falls back to static catalogue fixtures/defaults.
- Client components fetch `/api/site-content`, `/api/designs`, `/api/blogs`, and `/api/projects`; these are unnecessary for static copy and catalogue data.
- Admin CMS modules use `/api/admin/cms` and Atlas collections for text/pages, designs, categories, projects, blogs, revisions and settings.
- Image uploads currently create `media_assets` records in Atlas. That collection was not present at audit time. Existing Cloudinary assets are managed by `src/lib/media-store.ts`.
- Enquiries, owner notification email, admin auth/session, rate limiting and audit logging are separate from public CMS reads and must remain operational.

## Migration boundaries

1. Replace public CMS reads with static frontend content; retain actual text and existing catalogue order.
2. Keep Atlas content/history records intact. Remove public dependence on them, not the data.
3. Discover and optimize only confirmed active website images. Use deterministic public IDs and image metadata for placement/category mapping.
4. Retain original local image files as a recoverable source backup until every upload and placement is verified.
5. Do not delete existing Cloudinary samples, unused local assets, enquiry records, auth/session records, or CMS history as part of this work.
6. Confirm runtime-only image usage and deployed build/rendering before calling the migration complete.

## Post-implementation measurements

### Cloudinary migration

- Discovered 212 referenced source images; all 212 were uploaded and verified, with 0 missing references and 0 failed uploads.
- Replaced 407 source references across 31 files. Repeated placements point to shared Cloudinary assets rather than duplicate uploads.
- Original unique image bytes: 41,120,634. Optimized unique bytes: 23,634,730. Saved 17,485,904 bytes (42.5%).
- Category artwork uploaded: Arts and entertainment 1; Food and lifestyle 4; Kids education 11; Logo 7 (hidden/retired); Motivation 4; Nature and environment 7; Wildlife 6. Categories with no assigned artwork remain empty.
- Migration details and per-asset verification are recorded in `reports/cloudinary-image-migration.json` and `src/lib/cloudinary-image-manifest.generated.json`.

### Image and runtime audit

- Audited 20 routes: 217 rendered image references across 107 unique sources; 235 image files exist on disk.
- Found 0 missing assets, 0 exact duplicate file groups, 0 rendered near-duplicate pairs, and 0 unresolved cross-section image reuse. There are 23 documented intentional shared references. The file-level visual scan flagged 53 possible pairs for manual consideration, none of which appeared as rendered duplicates.
- `/api/site-images` returns 33 active public catalogue image records, with Cloudinary URLs and no website copy. Retired CAT-06 artwork stays out of the public catalogue.
- Removed public CMS text/data routes return 404; unauthenticated admin media requests return 401. Public content renders from static frontend data without a MongoDB read.

### Verification and deployment

- `npm run typecheck`: passed. `npm test`: 17 passed, 0 failed. `npm run lint`: passed with 8 raw `<img>` warnings for local blob previews in the visualizer and 0 errors. `npm run build`: passed.
- Local and live browser crawls covered the public pages and admin login: all checked pages returned 200, no broken images, browser page errors, console errors, or mobile horizontal overflow were observed.
- Live production deployment: `https://atelier-psi-lovat.vercel.app`. `/api/health` reports MongoDB, admin authentication, Cloudinary, and owner email configured. `/api/site-images` returns 33 Cloudinary-backed public catalogue entries.
- Enquiry notification is owner-only; no customer confirmation email is sent. The enquiry is saved in MongoDB before notification.
- No Atlas collections, historical enquiries, Cloudinary assets, or original local source images were deleted. The pre-migration Atlas export remains in the ignored local backup directory noted above.
- The migration and production deployment use existing Cloudinary Free, MongoDB Atlas M0, and Vercel project configuration. No paid-plan upgrade was made.
