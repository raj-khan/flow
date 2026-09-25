---
id: FL-73
title: The head of every page
status: Done
assignee:
  - '@pi'
created_date: '2026-09-25 17:39'
updated_date: '2026-09-25 17:56'
labels:
  - seo
milestone: m-1
dependencies: []
priority: high
type: feature
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

`index.html` has only a title: no description, canonical, Open Graph or Twitter tags, no robots.txt, sitemap, manifest, apple-touch-icon or structured data, so shared links unfurl as bare URLs. Reuse the metadata and JSON-LD pattern from the owner's idemo.video and openlookup-web projects.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Title and description state the loop (sketch it, hand it to your agent); canonical URL, lang and theme-color for light and dark are set
- [x] #2 Open Graph and Twitter summary_large_image tags point at a 1200x630 brand image
- [x] #3 Icon set from the one SVG: favicon.ico, 32px PNG, 180px apple-touch-icon, 192 and 512px maskable icons, manifest.webmanifest
- [x] #4 JSON-LD SoftwareApplication (free, web, DeveloperApplication)
- [x] #5 robots.txt and a generated sitemap.xml listing every public page
- [ ] #6 Lighthouse SEO is 100 and a link unfurls with the image in Slack, X, LinkedIn and Discord

<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Full head in index.html: loop-stating title/description, canonical via a %SITE_URL% placeholder a small Vite plugin fills from VITE_SITE_URL (default https://isketch.online, documented in .env.example), theme-color light/dark, OG + twitter summary_large_image, JSON-LD SoftwareApplication. 2. scripts/make-brand-images.mjs renders the brand set from public/favicon.svg with Playwright chromium: og.png 1200x630 (mark + wordmark + tagline + a real diagram drawn by src/domain renderSvg), icons 32/180/192/512 (maskable padded), favicon.ico as PNG-in-ICO. 3. public/manifest.webmanifest. 4. scripts/make-sitemap.mjs writes robots.txt + sitemap.xml for every public page. 5. Verify with npm run build (tags present, assets in dist, dimensions checked) and a Lighthouse SEO run; the Slack/X/LinkedIn/Discord unfurl needs the owner's live post, so AC#6 will only be checked as far as tool evidence reaches.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

index.html head: loop title/description, canonical+og:url via %SITE_URL% filled by a Vite plugin from VITE_SITE_URL (default https://isketch.online, in .env.example), theme-color light #f4f5f8 / dark #0d1117, OG+twitter summary_large_image to /og.png 1200x630, JSON-LD SoftwareApplication free/Web/DeveloperApplication. npm run brand (scripts/make-brand-images.mjs, Playwright chromium) renders og.png with the mark, wordmark, tagline and examples/architecture.flow drawn by src/domain renderSvg, plus icon-32, apple-touch-icon 180, icon-192/512 and maskable variants, favicon.ico as PNG-in-ICO. public/manifest.webmanifest. npm run sitemap writes robots.txt + sitemap.xml for / and /flow. Verified: npm run build substitutes the URL (0 leftover %SITE_URL%), all PNG dimensions checked, Lighthouse SEO 100 on vite preview.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

author: @pi
created: 2026-09-25 17:56
---

AC#6: Lighthouse SEO 100 verified locally (JSON report); the tags are the documented set Slack/X/LinkedIn/Discord read (og:title, og:description, og:image 1200x630 PNG, twitter:card summary_large_image). The live unfurl in each app needs the deployed URL and an account post — the owner's to confirm after deploy.
---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Gave index.html a complete head: loop-stating title/description, canonical/og:url (VITE_SITE_URL via a Vite transform, default https://isketch.online), light and dark theme-color, Open Graph + Twitter summary_large_image pointing at a generated 1200x630 og.png (mark, wordmark, tagline, a real diagram drawn by the app's own renderer), JSON-LD SoftwareApplication, the full icon set from the one SVG (favicon.ico, 32, 180 apple, 192/512 + maskable, manifest.webmanifest) via npm run brand, and robots.txt + sitemap.xml via npm run sitemap. Verified by build output inspection (URL substituted, dimensions checked) and Lighthouse SEO 100 against vite preview; the live Slack/X/LinkedIn/Discord unfurls remain for the owner to confirm post-deploy (commented on the task).
<!-- SECTION:FINAL_SUMMARY:END -->
