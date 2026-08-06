-- Promotions system: campaigns, targets, bundles, usage tracking
CREATE TABLE IF NOT EXISTS promotions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    promo_type      ENUM('percentage_discount','fixed_discount','buy_x_get_y','bundle_deal','coupon_code','free_delivery') NOT NULL,
    coupon_code     VARCHAR(50) UNIQUE DEFAULT NULL,
    max_uses        INT UNSIGNED DEFAULT NULL,
    times_used      INT UNSIGNED NOT NULL DEFAULT 0,
    discount_value  DECIMAL(10,2) DEFAULT NULL,
    buy_quantity    INT UNSIGNED DEFAULT NULL,
    get_quantity    INT UNSIGNED DEFAULT NULL,
    bundle_price    DECIMAL(10,2) DEFAULT NULL,
    min_order_amount DECIMAL(10,2) DEFAULT NULL,
    starts_at       TIMESTAMP NOT NULL,
    ends_at         TIMESTAMP NOT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    banner_text     VARCHAR(255) DEFAULT NULL,
    banner_color    VARCHAR(20) DEFAULT NULL,
    show_on_homepage TINYINT(1) NOT NULL DEFAULT 0,
    created_by      INT UNSIGNED DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS promotion_targets (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promotion_id    INT UNSIGNED NOT NULL,
    target_type     ENUM('product','variant','category','brand','all') NOT NULL,
    target_id       INT UNSIGNED DEFAULT NULL,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS promotion_bundle_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promotion_id    INT UNSIGNED NOT NULL,
    variant_id      INT UNSIGNED NOT NULL,
    quantity        INT UNSIGNED NOT NULL DEFAULT 1,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS promotion_usage (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promotion_id    INT UNSIGNED NOT NULL,
    customer_id     INT UNSIGNED DEFAULT NULL,
    order_id        INT UNSIGNED NOT NULL,
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promotion_id) REFERENCES promotions(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
