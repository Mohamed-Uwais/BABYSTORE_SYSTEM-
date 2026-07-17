const express = require('express');
const router = express.Router();
const pc = require('../controllers/promotionController');

router.get('/', pc.list);
router.get('/:id', pc.getById);
router.post('/', pc.create);
router.put('/:id', pc.update);
router.delete('/:id', pc.remove);
router.get('/:id/stats', pc.getStats);
router.post('/calculate', pc.calculateCart);

module.exports = router;
