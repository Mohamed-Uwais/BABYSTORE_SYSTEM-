# Existing functionality to retain — owner review checklist

Status: code-inventoried, not yet owner-approved or verified on the deployed system. Retain means preserve equivalent behaviour and data while improving the experience. A page's existence is not proof all its workflows work.

| ID | Existing functionality | Local evidence | Acceptance exercise |
|---|---|---|---|
| R01 | Home and promotional content | Home page, ContentContext, WebsiteContent | Compare each current homepage content block and promotion with new design |
| R02 | Shop and pagination | Shop page | Browse multiple pages; preserve filters on return |
| R03 | Category/brand/stock/sale filters and sorting | Shop and public catalogue model | Combine filters and check correct variants/prices |
| R04 | Search | Header, Shop and public catalogue model | Existing name/SKU/brand searches continue alongside typo tolerance |
| R05 | Product details and variants | ProductDetail | Direct URL, variant availability and image gallery |
| R06 | Discounts, quantity tiers and promotions | Public checkout and promotion utilities | Compare displayed and committed totals including free delivery |
| R07 | Cart and persistence | CartContext and CartDrawer | Add/edit/remove, reload, resume checkout without stale stock guarantees |
| R08 | COD and bank transfer | Checkout and public checkout controller | Pending payment, slip upload, retries and confirmation |
| R09 | Delivery zones/fees and pickup | Checkout and delivery model | Representative locations and quantities; pickup totals |
| R10 | Order confirmation | OrderConfirmation route | Correct accepted order reference and details |
| R11 | Track Order | TrackOrder route | Valid/invalid lookup; verify identity and privacy protections |
| R12 | Blog and individual posts | Blog and BlogPost routes | Listing, direct links and publishing workflow |
| R13 | About and Contact | About/Contact routes | Content, contact submission and validation |
| R14 | Existing URLs and navigation | Website App and Header | Preserve Home/Shop/Blog/About/Contact/Track Order; map changed URLs |
| R15 | POS inventory/manual website visibility | Inventory and product routes | Hidden product remains in inventory; public discovery/detail/checkout rules agree |
| R16 | POS website content and promotions | WebsiteContent and Promotions | Recreate current editable content and scheduled offer behaviour |
| R17 | Staff sessions and permissions | AuthContext, PermissionRoute and backend middleware | Content permissions do not broaden billing/settings access unintentionally |
| R18 | Existing POS operations | Billing, purchasing, orders, returns, reports and deliveries | Regression smoke tests; Phase 1 integration must not break existing workflows |

Owner walkthrough must identify additional business rules, external integrations, SEO URLs, policies and workflows not evident in this targeted review. Record each as retained, improved, explicitly replaced or deferred, with owner approval for removal. No functionality is approved for removal here.

## New capabilities requiring approved acceptance criteria

- Section navigation, mobile layout, animation presets and reduced motion.
- Typo-tolerant suggestions, size/age/price facets and variant-aware availability.
- Product/home video with posters and captions, without heavy initial download.
- Independent automatic/manual visibility policy.
- Full routine content management in POS with drafts, preview, publication and rollback.
- Stock reservations and end-to-end synchronisation/reconciliation.
- Performance, accessibility, SEO, migration, training, ownership and warranty arrangements.

For each item, final requirements should record example inputs, expected results, role permissions and failure behaviour before implementation.
