const express = require('express');
const router = express.Router();
const c = require('../controllers/quotationController');

router.get('/', c.getAll);
router.get('/:id', c.getById);
router.post('/', c.create);
router.patch('/:id/status', c.updateStatus);

module.exports = router;
