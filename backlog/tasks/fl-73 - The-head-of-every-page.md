---
id: FL-73
title: The head of every page
status: To Do
assignee: []
created_date: '2026-09-25 17:39'
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
- [ ] #1 Title and description state the loop (sketch it, hand it to your agent); canonical URL, lang and theme-color for light and dark are set
- [ ] #2 Open Graph and Twitter summary_large_image tags point at a 1200x630 brand image
- [ ] #3 Icon set from the one SVG: favicon.ico, 32px PNG, 180px apple-touch-icon, 192 and 512px maskable icons, manifest.webmanifest
- [ ] #4 JSON-LD SoftwareApplication (free, web, DeveloperApplication)
- [ ] #5 robots.txt and a generated sitemap.xml listing every public page
- [ ] #6 Lighthouse SEO is 100 and a link unfurls with the image in Slack, X, LinkedIn and Discord
<!-- AC:END -->
