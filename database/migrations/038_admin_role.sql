-- Preserve existing roles while enabling the explicitly unrestricted administrator role.
ALTER TABLE users MODIFY role ENUM('owner','cashier','admin') NOT NULL DEFAULT 'cashier';
