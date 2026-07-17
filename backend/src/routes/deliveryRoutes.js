const express = require('express');
const router = express.Router();
const c = require('../controllers/deliveryController');

router.get('/zones', c.getZones);
router.post('/zones', c.createZone);
router.put('/zones/:id', c.updateZone);
router.delete('/zones/:id', c.deleteZone);

router.get('/weight-tiers', c.getWeightTiers);
router.post('/weight-tiers', c.createWeightTier);
router.put('/weight-tiers/:id', c.updateWeightTier);
router.delete('/weight-tiers/:id', c.deleteWeightTier);

router.get('/calculate-fee', c.calculateFee);

module.exports = router;
