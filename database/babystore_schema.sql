-- ============================================================================
-- LITTORA UNIFIED DATABASE SCHEMA
-- Shared by: POS System, WhatsApp/Instagram/Messenger Chatbot, Public Website
-- Engine: MySQL 8.0+
-- ============================================================================
-- Design principles:
--   1. Phone number is the universal customer identifier across all 3 systems
--   2. Products have variants (size/count), each with its own SKU
--   3. Stock is tracked in batches (no expiry logic, but structure allows it later)
--   4. Loyalty points + credit tab live in ONE ledger table (customer_ledger)
--     to avoid double-booking / sync bugs between "two wallets"
--   5. Orders table is channel-agnostic: same table for POS, chatbot, website
--   6. Delivery is pluggable per-courier (courier_code field + JSON meta)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- SECTION 1: USERS & AUTH (POS staff)
-- ============================================================================

CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('owner', 'cashier') NOT NULL DEFAULT 'cashier',
    phone           VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 2: CATALOG (categories, brands, tags, products, variants)
-- ============================================================================

CREATE TABLE categories (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(120) NOT NULL UNIQUE,
    parent_id       INT UNSIGNED NULL,               -- allows subcategories later, nullable = flat by default
    image_url       VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE brands (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(120) NOT NULL UNIQUE,
    logo_url        VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE tags (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    slug            VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Parent product (e.g. "Huggies Diapers"). Variants below hold actual sellable SKUs.
CREATE TABLE products (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id     INT UNSIGNED NOT NULL,
    brand_id        INT UNSIGNED NULL,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(220) NOT NULL UNIQUE,
    description     TEXT,
    low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5,   -- per-product default; can be overridden per-variant
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (brand_id) REFERENCES brands(id),
    INDEX idx_products_name (name),
    FULLTEXT INDEX ft_products_search (name, description)
) ENGINE=InnoDB;

CREATE TABLE product_tags (
    product_id      INT UNSIGNED NOT NULL,
    tag_id          INT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, tag_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- The actual sellable unit. E.g. Product "Huggies Diapers" -> Variant "Size M, 20pk"
CREATE TABLE product_variants (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id          INT UNSIGNED NOT NULL,
    sku                 VARCHAR(50) NOT NULL UNIQUE,
    barcode             VARCHAR(50) UNIQUE,             -- scanned or manually entered
    variant_label       VARCHAR(100) NOT NULL,          -- e.g. "Size M / 20pk"
    image_url           VARCHAR(500),

    -- Pricing
    cost_price          DECIMAL(10,2) NOT NULL DEFAULT 0,     -- auto-updated from PO landed cost
    wholesale_price      DECIMAL(10,2) NOT NULL DEFAULT 0,
    retail_price         DECIMAL(10,2) NOT NULL DEFAULT 0,
    mrp                  DECIMAL(10,2) NULL,                   -- printed max retail price
    discount_type        ENUM('none', 'percent', 'amount') NOT NULL DEFAULT 'none',
    discount_value        DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Stock & alerts
    current_stock        INT NOT NULL DEFAULT 0,               -- denormalized total, kept in sync by stock_movements
    low_stock_threshold   INT UNSIGNED NULL,                    -- overrides product-level default if set
    reorder_suggestion_qty INT UNSIGNED NULL,                   -- auto-suggested reorder amount

    weight_grams          INT UNSIGNED NULL,                    -- used for delivery fee weight tiers

    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_variant_barcode (barcode),
    INDEX idx_variant_stock (current_stock)
) ENGINE=InnoDB;

-- Effective selling price after discount, computed on the fly in app layer or via a VIEW (see bottom of file)

-- Quantity-based pricing tiers for bulk/pack discounts
CREATE TABLE variant_price_tiers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id      INT UNSIGNED NOT NULL,
    min_quantity    INT UNSIGNED NOT NULL,
    tier_price      DECIMAL(10,2) NOT NULL,
    label           VARCHAR(50),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    INDEX idx_tier_variant (variant_id, min_quantity)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 3: SUPPLIERS & PURCHASE ORDERS
-- ============================================================================

CREATE TABLE suppliers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    contact_person  VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(150),
    address         VARCHAR(255),
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_number           VARCHAR(30) NOT NULL UNIQUE,          -- e.g. PO-2026-0001
    supplier_id         INT UNSIGNED NOT NULL,
    status              ENUM('placed', 'paid', 'shipped', 'received', 'cancelled') NOT NULL DEFAULT 'placed',

    -- Entered at "paid" step (not at creation)
    transport_charge    DECIMAL(10,2) NULL,

    created_by          INT UNSIGNED NOT NULL,
    paid_at              TIMESTAMP NULL,
    shipped_at           TIMESTAMP NULL,
    received_at          TIMESTAMP NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id   INT UNSIGNED NOT NULL,
    variant_id          INT UNSIGNED NOT NULL,
    quantity             INT UNSIGNED NOT NULL,

    -- NULL at creation ("placed" only has items+qty). Filled in at "paid" step.
    unit_cost_price      DECIMAL(10,2) NULL,          -- cost per unit from supplier invoice
    transport_share       DECIMAL(10,2) NULL,          -- this item's share of transport_charge (qty-based split)
    landed_unit_cost      DECIMAL(10,2) NULL,          -- unit_cost_price + transport_share = auto-applied to product_variants.cost_price

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB;

-- Stock batches created when a PO is marked "received"
CREATE TABLE stock_batches (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id          INT UNSIGNED NOT NULL,
    purchase_order_id   INT UNSIGNED NULL,             -- NULL if manually added stock (no PO)
    batch_code          VARCHAR(50),
    quantity_received    INT UNSIGNED NOT NULL,
    quantity_remaining    INT UNSIGNED NOT NULL,        -- decremented as this batch is sold (FIFO-ready if expiry added later)
    unit_cost             DECIMAL(10,2) NOT NULL,
    received_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Full audit trail of every stock change (receiving, sale, refund, adjustment)
CREATE TABLE stock_movements (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id      INT UNSIGNED NOT NULL,
    change_qty      INT NOT NULL,                       -- positive = stock in, negative = stock out
    reason          ENUM('purchase_received', 'sale', 'refund', 'manual_adjustment', 'stock_toggle') NOT NULL,
    reference_type  VARCHAR(30),                         -- 'order', 'purchase_order', etc.
    reference_id     INT UNSIGNED,
    created_by        INT UNSIGNED NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_stock_movements_variant (variant_id, created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 4: CUSTOMERS, LOYALTY & CREDIT (phone = universal identity)
-- ============================================================================

CREATE TABLE customers (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    phone               VARCHAR(20) NOT NULL UNIQUE,     -- UNIVERSAL identifier across POS/chatbot/website
    full_name            VARCHAR(150),
    email                 VARCHAR(150),
    address                VARCHAR(255),
    city                    VARCHAR(100),
    customer_type          ENUM('walk_in', 'loyalty') NOT NULL DEFAULT 'walk_in',
    loyalty_tier            ENUM('none', 'silver', 'gold', 'platinum') NOT NULL DEFAULT 'none',
    loyalty_points_balance  INT NOT NULL DEFAULT 0,        -- denormalized, kept in sync by customer_ledger
    credit_balance          DECIMAL(10,2) NOT NULL DEFAULT 0, -- denormalized running balance (positive = customer owes shop)
    credit_limit            DECIMAL(10,2) DEFAULT NULL,        -- optional max credit allowed (NULL = no limit)
    source_channel           ENUM('pos', 'whatsapp', 'instagram', 'messenger', 'website') NOT NULL DEFAULT 'pos',
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_customers_phone (phone)
) ENGINE=InnoDB;

-- SINGLE ledger for both loyalty points and credit tab - avoids double-booking bugs.
-- Each row is one transaction. Running balances above are denormalized caches of this table.
CREATE TABLE customer_ledger (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT UNSIGNED NOT NULL,
    entry_type      ENUM(
                        'points_earned', 'points_redeemed',
                        'credit_issued', 'credit_repaid'
                    ) NOT NULL,
    points_delta    INT NOT NULL DEFAULT 0,          -- +/- points
    credit_delta    DECIMAL(10,2) NOT NULL DEFAULT 0, -- +/- credit balance (positive = customer now owes more)
    reference_type  VARCHAR(30),                      -- 'order', 'manual', 'repayment'
    reference_id     INT UNSIGNED,
    notes             VARCHAR(255),
    created_by         INT UNSIGNED NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_ledger_customer (customer_id, created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 5: DELIVERY LOOKUPS (created before orders since orders references delivery_zones)
-- ============================================================================

CREATE TABLE delivery_zones (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    zone_name       VARCHAR(100) NOT NULL,             -- e.g. "Colombo District"
    base_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
    per_additional_pack_fee DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE delivery_weight_tiers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    min_weight_grams INT UNSIGNED NOT NULL,
    max_weight_grams INT UNSIGNED NULL,                -- NULL = no upper bound
    surcharge        DECIMAL(10,2) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE couriers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(30) NOT NULL UNIQUE,        -- 'koombiyo', 'fardar' - matches backend adapter key
    name            VARCHAR(100) NOT NULL,
    has_api          BOOLEAN NOT NULL DEFAULT FALSE,     -- true = live API integration (Koombiyo), false = manual tracking link (Fardar)
    tracking_url_template VARCHAR(255),                  -- e.g. https://trackthispackage.com/koombiyo/{tracking_number}
    is_active        BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 6: ORDERS (channel-agnostic - POS, chatbot, website all use this)
-- ============================================================================

CREATE TABLE orders (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number        VARCHAR(30) NOT NULL UNIQUE,      -- e.g. ORD-2026-000123
    channel              ENUM('pos', 'whatsapp', 'instagram', 'messenger', 'website') NOT NULL,
    customer_id           INT UNSIGNED NULL,                -- NULL allowed for anonymous walk-in POS sale
    cashier_id             INT UNSIGNED NULL,                 -- staff who processed it (POS only)

    status                  ENUM('pending', 'confirmed', 'processing', 'out_for_delivery',
                                'completed', 'cancelled', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'pending',

    subtotal                 DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_total             DECIMAL(10,2) NOT NULL DEFAULT 0,
    delivery_fee                 DECIMAL(10,2) NOT NULL DEFAULT 0,
    grand_total                    DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Fulfillment
    fulfillment_type    ENUM('pickup', 'self_delivery', 'courier_delivery') NOT NULL DEFAULT 'pickup',
    delivery_address     VARCHAR(255),
    delivery_zone_id       INT UNSIGNED NULL,

    notes                   TEXT,
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (delivery_zone_id) REFERENCES delivery_zones(id),
    INDEX idx_orders_channel (channel, created_at),
    INDEX idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL,
    variant_id      INT UNSIGNED NOT NULL,
    quantity        INT UNSIGNED NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,          -- price at time of sale (snapshot, protects history from later price changes)
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    line_total      DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB;

-- Supports split payments: one order can have multiple payment rows
CREATE TABLE order_payments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL,
    payment_method  ENUM('cash', 'card', 'bank_transfer', 'store_credit', 'online_gateway') NOT NULL,
    amount          DECIMAL(10,2) NOT NULL,
    reference_note  VARCHAR(255),                     -- e.g. bank slip ref, card last 4
    paid_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 7: ORDER DELIVERIES (per-order courier assignment)
-- ============================================================================

CREATE TABLE order_deliveries (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id             INT UNSIGNED NOT NULL UNIQUE,
    courier_id            INT UNSIGNED NULL,             -- NULL if self-delivery
    tracking_number         VARCHAR(100),
    receiver_name             VARCHAR(150),
    receiver_phone             VARCHAR(20),
    receiver_address             VARCHAR(255),
    last_status                    VARCHAR(100),          -- cached from courier API/scrape, refreshed on Track click
    last_status_checked_at           TIMESTAMP NULL,
    label_printed                       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (courier_id) REFERENCES couriers(id)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 8: RETURNS / REFUNDS
-- ============================================================================

CREATE TABLE order_returns (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL,
    order_item_id   INT UNSIGNED NOT NULL,
    quantity        INT UNSIGNED NOT NULL,
    reason          VARCHAR(255),
    refund_amount   DECIMAL(10,2) NOT NULL,
    restock          BOOLEAN NOT NULL DEFAULT TRUE,      -- whether returned stock goes back to sellable inventory
    processed_by      INT UNSIGNED NOT NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (order_item_id) REFERENCES order_items(id),
    FOREIGN KEY (processed_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 9: CHATBOT (WhatsApp / Instagram / Messenger conversations)
-- ============================================================================

CREATE TABLE chatbot_conversations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT UNSIGNED NULL,                  -- linked once phone is captured
    channel         ENUM('whatsapp', 'instagram', 'messenger') NOT NULL,
    channel_user_id  VARCHAR(100) NOT NULL,               -- platform-specific sender ID
    status            ENUM('active', 'ghost_pending', 'closed') NOT NULL DEFAULT 'active',
    last_message_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ghost_nudge_sent_at TIMESTAMP NULL,                   -- when the auto follow-up nudge was sent
    confusion_count       INT UNSIGNED NOT NULL DEFAULT 0, -- increments on repeated unclear replies, triggers owner alert
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    UNIQUE KEY uq_channel_user (channel, channel_user_id),
    INDEX idx_conversations_status (status)
) ENGINE=InnoDB;

CREATE TABLE chatbot_messages (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id  INT UNSIGNED NOT NULL,
    sender          ENUM('customer', 'bot', 'owner') NOT NULL,
    message_text     TEXT,
    image_url        VARCHAR(500),
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    INDEX idx_messages_conversation (conversation_id, created_at)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 10: WEBSITE (blog for SEO)
-- ============================================================================

CREATE TABLE blog_posts (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    slug            VARCHAR(220) NOT NULL UNIQUE,
    cover_image_url  VARCHAR(500),
    content           LONGTEXT NOT NULL,
    meta_description   VARCHAR(300),
    is_published         BOOLEAN NOT NULL DEFAULT FALSE,
    published_at           TIMESTAMP NULL,
    created_by                INT UNSIGNED NULL,
    created_at                    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============================================================================
-- SECTION 10: STORE SETTINGS (single-row configuration for receipts, branding)
-- ============================================================================

CREATE TABLE store_settings (
    id              INT UNSIGNED PRIMARY KEY DEFAULT 1,
    store_name      VARCHAR(150) NOT NULL DEFAULT 'LITTORA',
    address_line1   VARCHAR(255) DEFAULT '',
    address_line2   VARCHAR(255) DEFAULT '',
    city            VARCHAR(100) DEFAULT '',
    phone           VARCHAR(20) DEFAULT '',
    email           VARCHAR(150) DEFAULT '',
    tax_id          VARCHAR(50) DEFAULT '',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT 'Rs.',
    receipt_footer  TEXT,
    logo_url        VARCHAR(255) DEFAULT '',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB;

INSERT IGNORE INTO store_settings (id, store_name, currency_symbol, receipt_footer)
VALUES (1, 'LITTORA', 'Rs.', 'Thank you for shopping with us!');

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- SEED DATA: minimal starter rows so the app isn't empty on first run
-- ============================================================================

INSERT INTO couriers (code, name, has_api, tracking_url_template, is_active) VALUES
('koombiyo', 'Koombiyo Delivery', TRUE, NULL, TRUE),
('fardar', 'Fardar Express', FALSE, 'https://trackmate.lk/fardar/{tracking_number}', TRUE);

INSERT INTO users (full_name, username, password_hash, role) VALUES
('Mohamed', 'owner', '$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH', 'owner');
