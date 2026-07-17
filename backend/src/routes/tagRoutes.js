const express = require('express');
const router = express.Router();
const c = require('../controllers/tagController');

router.get('/', c.getAllTags);
router.post('/', c.createTag);
router.delete('/:id', c.deleteTag);
router.put('/products/:productId', c.setProductTags);

module.exports = router;
