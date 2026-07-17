const db = require('../config/db');

async function getZones() {
  const [rows] = await db.query('SELECT * FROM delivery_zones ORDER BY zone_name');
  return rows;
}

async function createZone({ zone_name, base_fee, per_additional_pack_fee }) {
  const [result] = await db.query(
    'INSERT INTO delivery_zones (zone_name, base_fee, per_additional_pack_fee) VALUES (?, ?, ?)',
    [zone_name, base_fee, per_additional_pack_fee ?? 100]
  );
  return { id: result.insertId, zone_name, base_fee, per_additional_pack_fee: per_additional_pack_fee ?? 100, is_active: true };
}

async function updateZone(id, { zone_name, base_fee, per_additional_pack_fee }) {
  await db.query(
    'UPDATE delivery_zones SET zone_name = ?, base_fee = ?, per_additional_pack_fee = ? WHERE id = ?',
    [zone_name, base_fee, per_additional_pack_fee ?? 100, id]
  );
  const [[row]] = await db.query('SELECT * FROM delivery_zones WHERE id = ?', [id]);
  return row;
}

async function deleteZone(id) {
  await db.query('DELETE FROM delivery_zones WHERE id = ?', [id]);
}

async function getWeightTiers() {
  const [rows] = await db.query('SELECT * FROM delivery_weight_tiers ORDER BY min_weight_grams');
  return rows;
}

async function createWeightTier({ min_weight_grams, max_weight_grams, surcharge }) {
  const [result] = await db.query(
    'INSERT INTO delivery_weight_tiers (min_weight_grams, max_weight_grams, surcharge) VALUES (?, ?, ?)',
    [min_weight_grams, max_weight_grams || null, surcharge]
  );
  return { id: result.insertId, min_weight_grams, max_weight_grams, surcharge };
}

async function updateWeightTier(id, { min_weight_grams, max_weight_grams, surcharge }) {
  await db.query(
    'UPDATE delivery_weight_tiers SET min_weight_grams = ?, max_weight_grams = ?, surcharge = ? WHERE id = ?',
    [min_weight_grams, max_weight_grams || null, surcharge, id]
  );
  const [[row]] = await db.query('SELECT * FROM delivery_weight_tiers WHERE id = ?', [id]);
  return row;
}

async function deleteWeightTier(id) {
  await db.query('DELETE FROM delivery_weight_tiers WHERE id = ?', [id]);
}

async function calculateFee({ zone_id, total_weight_grams, total_packs }) {
  const [[zone]] = await db.query('SELECT * FROM delivery_zones WHERE id = ?', [zone_id]);
  if (!zone) throw new Error('Delivery zone not found');

  const baseFee = Number(zone.base_fee);
  const packFee = Number(zone.per_additional_pack_fee || 100);
  const packs = Number(total_packs) || 1;

  let weightSurcharge = 0;
  if (total_weight_grams > 0) {
    const [tiers] = await db.query(
      `SELECT * FROM delivery_weight_tiers
       WHERE min_weight_grams <= ? AND (max_weight_grams IS NULL OR max_weight_grams >= ?)
       ORDER BY min_weight_grams DESC LIMIT 1`,
      [total_weight_grams, total_weight_grams]
    );
    if (tiers.length > 0) {
      weightSurcharge = Number(tiers[0].surcharge);
    }
  }

  const additionalPacksFee = Math.max(0, packs - 1) * packFee;
  return {
    base_fee: baseFee,
    per_additional_pack_fee: packFee,
    total_packs: packs,
    additional_packs_fee: additionalPacksFee,
    weight_surcharge: weightSurcharge,
    total_fee: baseFee + additionalPacksFee + weightSurcharge,
  };
}

async function calculateSelfDeliveryFee({ total_packs }) {
  const [zones] = await db.query('SELECT * FROM delivery_zones WHERE is_active = TRUE ORDER BY id LIMIT 1');
  if (!zones.length) return { base_fee: 0, additional_packs_fee: 0, total_fee: 0 };
  const zone = zones[0];
  const baseFee = Number(zone.base_fee);
  const packFee = Number(zone.per_additional_pack_fee || 100);
  const packs = Number(total_packs) || 1;
  const additionalPacksFee = Math.max(0, packs - 1) * packFee;
  return {
    base_fee: baseFee,
    per_additional_pack_fee: packFee,
    total_packs: packs,
    additional_packs_fee: additionalPacksFee,
    total_fee: baseFee + additionalPacksFee,
  };
}

module.exports = { getZones, createZone, updateZone, deleteZone, getWeightTiers, createWeightTier, updateWeightTier, deleteWeightTier, calculateFee, calculateSelfDeliveryFee };
