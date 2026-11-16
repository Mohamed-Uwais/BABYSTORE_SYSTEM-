const express=require('express');
const {createStudio}=require('../services/websiteStudio');
const {createRepository}=require('../models/websiteStudioRepository');
// Mounted behind authentication + settings permission; opt-in only.
const router=express.Router();
router.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  next();
});
let studio;
const service=()=>studio||(studio=createStudio(createRepository(require('../config/db'))));
const handle=fn=>async(req,res,next)=>{try{res.json({success:true,data:await fn(req)});}catch(error){next(error);}};
router.get('/draft',handle(()=>service().read()));
router.get('/revisions',handle(()=>service().revisions()));
router.put('/draft/:section',handle(req=>service().saveSection({section:req.params.section,content:req.body.content,expectedVersion:req.body.expectedVersion,actor:req.user.id})));
router.post('/publish',handle(req=>service().publish({expectedVersion:req.body.expectedVersion,actor:req.user.id})));
router.post('/restore/:id',handle(req=>service().restore({revisionId:Number(req.params.id),expectedVersion:req.body.expectedVersion,actor:req.user.id})));
module.exports=router;
