-- CMS content management for the public website
CREATE TABLE IF NOT EXISTS website_content (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    section_key     VARCHAR(100) NOT NULL UNIQUE,
    content         JSON NOT NULL,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact form messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(20) DEFAULT NULL,
    email       VARCHAR(100) DEFAULT NULL,
    message     TEXT NOT NULL,
    is_read     TINYINT(1) DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
