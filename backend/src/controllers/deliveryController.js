const deliveryModel = require('../models/deliveryModel');

async function getZones(req, res) {
  try {
    const zones = await deliveryModel.getZones();
    res.json({ success: true, data: zones });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function createZone(req, res) {
  try {
    const zone = await deliveryModel.createZone(req.body);
    res.status(201).json({ success: true, data: zone });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function updateZone(req, res) {
  try {
    const zone = await deliveryModel.updateZone(req.params.id, req.body);
    res.json({ success: true, data: zone });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function deleteZone(req, res) {
  try {
    await deliveryModel.deleteZone(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function getWeightTiers(req, res) {
  try {
    const tiers = await deliveryModel.getWeightTiers();
    res.json({ success: true, data: tiers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
}

async function createWeightTier(req, res) {
  try {
    const tier = await deliveryModel.createWeightTier(req.body);
    res.status(201).json({ success: true, data: tier });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function updateWeightTier(req, res) {
  try {
    const tier = await deliveryModel.updateWeightTier(req.params.id, req.body);
    res.json({ success: true, data: tier });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function deleteWeightTier(req, res) {
  try {
    await deliveryModel.deleteWeightTier(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

async function calculateFee(req, res) {
  try {
    const result = await deliveryModel.calculateFee(req.query);
    res.json({ success: true, data: result });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
}

module.exports = { getZones, createZone, updateZone, deleteZone, getWeightTiers, createWeightTier, updateWeightTier, deleteWeightTier, calculateFee };
