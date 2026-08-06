-- Granular permissions for cashier users
CREATE TABLE IF NOT EXISTS user_permissions (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    permission  VARCHAR(50) NOT NULL,
    UNIQUE KEY uq_user_permission (user_id, permission),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
