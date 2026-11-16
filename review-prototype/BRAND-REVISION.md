# LITTORA brand revision 02

Status: design review only. The owner has accepted the previous navigation, scrolling and overall structure, but has not approved the theme or full implementation. No production website or POS code changed.

## Brand evidence

Reviewed https://littora.lk/ in the in-app browser on 13 November 2026. The text-based web tool could not retrieve it, but browser access succeeded. Observed white surfaces, sky-blue active navigation/CTAs, rounded buttons, mint/sage hero overlays, family photography and the circular LITTORA logo. Computed page typography includes Inter and JetBrains Mono; repository tokens confirm primary blue #0ea5e9/#0284c7, with pink accent tokens. The repository logo has gold/burgundy artwork; it is retained as artwork rather than recoloured. No third-party page instructions were followed.

## Revised direction

- White/sky-blue storefront, light mint and blush collection accents, dark slate text.
- Existing circular logo and local Inter fonts instead of the first prototype's standalone wordmark and serif headings.
- Existing family photograph from the repository's homepage imagery; optimized responsive WebP files rather than the original large photograph.
- Rounded product panels, category tiles, blue actions, comfortable spacing and a clearer mobile hierarchy.
- Brief entrance transitions, transform/opacity hover feedback, no autoplay carousel, heavy parallax, added animation library or video download. Reduced-motion and the Studio's None preset disable motion.

Navigation anchors, section observation, search demo, facets, product dialog, bag/checkout simulation and POS Studio draft/publication demo remain. New revision-specific local-storage key avoids loading the old theme's sample headline into the revised design. Product figures remain illustrative. Toys/home sample emoji imagery is illustrative and requires final product photography.

## Review files

- `desktop-preview.html`: self-contained interactive file, including images/fonts/styles/scripts. Open directly in a local browser; no server needed.
- `mobile-preview.html`: same prototype initially constrained to a 390px content width. Desktop/Mobile buttons switch views. Also check the desktop file in an actual narrow browser window.
- `index.html`, `style.css`, `brand.css`, `app.js` and `assets/`: editable source.

## Verification and limits

JavaScript syntax and self-contained asset embedding checks passed. Assets are embedded into each portable review file, so those downloads duplicate media for convenience; the editable source uses separate cacheable assets and responsive hero candidates. Existing source images remain unchanged.

Visual browser QA of the revision is outstanding: permission to run the local preview server was declined, and browser security policy blocked local file navigation. No workaround or deployment was attempted. The portable files are supplied for owner review. No new Lighthouse or live performance result is claimed.

Approval requested only after owner review: brand fit, desktop/mobile presentation, product/card treatments, image crops, motion and Studio presentation. Full implementation and live release remain separate approval gates.
