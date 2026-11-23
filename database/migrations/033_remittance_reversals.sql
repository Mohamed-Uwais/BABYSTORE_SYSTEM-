CREATE TABLE courier_remittance_reversals (
 remittance_id INT UNSIGNED PRIMARY KEY,
 reason VARCHAR(500) NOT NULL,
 staff_id INT UNSIGNED NOT NULL,
 reversed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(remittance_id) REFERENCES courier_remittances(id),
 FOREIGN KEY(staff_id) REFERENCES users(id)
);
