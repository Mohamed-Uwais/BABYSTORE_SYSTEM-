# Phase 1 scope clarification — existing-site upgrade and configurable filters

Owner has approved the prototype's visual direction, navigation, scrolling behaviour and overall structure. Category filtering and final implementation requirements remain subject to review. This approval does not authorise production deployment.

## Existing-site strategy

Modify the current React/Vite website, Express backend and relevant POS screens in the existing repository. Reuse products, variants, categories, brands, prices, order records and shared inventory authority. Retain working shopping and staff workflows listed in RETAINED-FEATURES.md, including promotions, quantity tiers, payment methods, delivery fees, tracking and blog content.

Keep current product slugs and established routes (/shop, /product/:slug, /blog, /blog/:slug, /about, /contact, /track, checkout and confirmation routes). If a necessary route change is discovered, supply a URL mapping and redirects for approval. Do not generate replacement product records, alter historic orders or change identifiers merely to match the design.

The standalone prototype is a review artifact, not a replacement commerce application. Redesign presentation components and extend existing integration contracts. No whole-site rebuild is currently justified. If discovery proves a subsystem cannot safely support the requirements, document the reason, retained data/behaviour, migration, rollback and additional effort before seeking approval for that change.

## Category-specific filters

| Category | Proposed attributes, subject to actual catalogue |
|---|---|
| Diapers | Brand, size, tape/pant type, pieces per pack; optional supplier-provided weight range |
| Wet wipes | Brand, fragrance, wipes per pack; optional sensitive-skin or alcohol-free claims only when verified |
| Toys | Toy type (die-cast, electric, toy guns, stacking/learning), supplier age group, brand, power source; optional material |
| Flowers and décor | Type (bouquets, hanging flowers, vases, bonsai, baskets), colour, material, indoor/outdoor use; optional dimensions and artificial/live classification where relevant |

All categories support minimum/maximum price, availability and agreed sorting. Show only category-assigned enabled attributes. Across all collections show common controls, not every category's specialist attributes. Type-specific refinements, such as battery voltage only for electric toys, can use explicitly configured subcategories/attribute assignments; no inferred product safety claims.

Several selected options in one attribute are OR; separate attributes, search, category, price bounds and availability are AND. Category changes clear irrelevant attribute selections. Clear/reset is available and empty results explain how to broaden the selection. Production filters must use the same eligible variant for size/price/availability matches. Do not combine a size from one variant with price or stock from another. Missing metadata must not be invented.

Production scope includes URL-backed filter state, keyboard/mobile access, server validation, pagination and relevant option counts. Define numeric ranges, units, sort order and multi-valued attributes explicitly in schemas rather than storing unvalidated display text. Choose final attribute types during requirements review; prototype options are discrete checkboxes.

## POS management scope

Routine configuration, without source changes: add/edit categories and their order; configure attribute labels, supported types and options; assign attributes to categories; assign values to products/variants; enable/disable filters; preview drafts before publication. Support stable category/attribute/option IDs, validation, publication permissions and audit records. Additions within supported types need no deployment. A new bespoke control type or new business rule requires development.

Adding a filter to an existing category does not populate historical products automatically. Provide an unassigned-data report and, if agreed in implementation scope, a validated bulk-assignment/import workflow. Renaming options must preserve assignments through IDs. Block deletion of in-use categories/options or require an explicit reassignment/archive workflow. Retain existing category IDs and slugs during any attribute migration.

## Prototype demonstration and acceptance

The browser-local prototype now demonstrates:

1. Select Diapers: brand, size, type and pack count appear; select multiple options and combine with price/stock.
2. Select Toys: diaper controls disappear; toy type, age, brand and power source appear.
3. Select Flowers and décor: décor type, colour, material and use appear.
4. Open POS Website Studio → Categories & filters; add a category, add an attribute/options, or extend an option list.
5. Under Products, change a product's category and assign values using category-relevant controls.
6. Preview draft or publish to the demo browser; the storefront consumes that configuration. Reload after demo publication to check persistence; reset to restore samples.

Prototype changes do not write to the real POS. Product examples are illustrative; no production schema migrations or new APIs have been implemented. Browser visual QA remains outstanding due the previously declined local server and blocked local-file browser access. Automated filter logic tests do not replace final browser/staging UAT.

Before live release: demonstrate the above against staging database records, verify eligible-variant correctness, URL restore, permissions, draft isolation, option rename/archive behaviour, pagination/counts, performance and preserved existing functionality. Include tests for conflicting filters, no matches, stale URLs and manually hidden products.

## Budget and approval

Treat configurable category filters and POS management as explicit Phase 1 requirements in the final backlog. Do not silently treat them as hard-coded demo-only features. The earlier LKR 850,000 is still a planning estimate; confirm the configuration/data-migration effort before fixing price. Any proposed increase requires prior owner agreement. Visual approval is recorded; final scope and implementation approval must be recorded separately. Every live release requires separate explicit approval.
