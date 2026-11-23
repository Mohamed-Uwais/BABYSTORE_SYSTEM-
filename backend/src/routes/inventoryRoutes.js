const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
router.use(require('../utils/financialVisibility').hideCosts);
router.get('/batches/:variantId',async(req,res,next)=>{
  try{res.json({data:await require('../models/inventoryModel').batchEvidence(req.params.variantId)});}catch(error){next(error);}
});
router.post('/reconcile',require('../middleware/authMiddleware').restrictTo('owner'),async(req,res)=>{
  try{res.json({data:await require('../models/inventoryModel').reconcileStock({...req.body,created_by:req.user.id})});}
  catch(error){res.status(400).json({message:error.message});}
});

router.get('/variants', inventoryController.allVariants);
router.post('/stock-toggle', inventoryController.stockToggle);
router.post('/adjust', inventoryController.adjustStock);
router.get('/movements/:variantId', inventoryController.movements);

module.exports = router;
