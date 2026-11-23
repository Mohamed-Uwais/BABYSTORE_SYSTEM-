ALTER TABLE courier_remittances ADD source_remittance_id INT UNSIGNED NULL,
 ADD CONSTRAINT fk_remittance_source FOREIGN KEY(source_remittance_id) REFERENCES courier_remittances(id);
