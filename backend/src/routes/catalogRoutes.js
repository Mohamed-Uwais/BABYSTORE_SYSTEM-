const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const attributes = require('../models/catalogAttributesModel');
const handle = fn => async (req,res,next) => {try {res.json({success:true,data:await fn(req)});} catch(error) {next(error);} };
const productContent=require('../models/websiteProductModel');
const mediaUpload=require('../middleware/websiteMediaUpload');
router.post('/media',mediaUpload.upload,mediaUpload.save);
router.get('/products/:id/content',handle(req=>productContent.read(req.params.id)));
router.put('/products/:id/content',handle(req=>productContent.save(req.params.id,req.body)));
router.get('/categories/:id/filters', handle(req=>attributes.read(req.params.id)));
router.put('/categories/:id/filters', handle(req=>attributes.save(req.params.id,req.body.definitions,req.body.expectedVersion)));
router.get('/categories/:id/variants', handle(req=>attributes.variants(req.params.id)));
router.put('/categories/:id/variants/:variantId/attributes', handle(req=>attributes.assign(req.params.id,req.params.variantId,req.body.values)));

router.get('/categories', catalogController.listCategories);
router.get('/brands', catalogController.listBrands);
router.post('/categories', catalogController.addCategory);
router.post('/brands', catalogController.addBrand);

module.exports = router;
