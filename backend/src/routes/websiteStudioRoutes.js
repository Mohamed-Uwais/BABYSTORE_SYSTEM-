const express=require('express');
const {createStudio}=require('../services/websiteStudio');
const {createRepository}=require('../models/websiteStudioRepository');
// Mounted behind authentication + settings permission; opt-in only.
const router=express.Router();
const mediaUpload=require('../middleware/websiteMediaUpload');
router.post('/media',mediaUpload.upload,mediaUpload.save);
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
router.get('/article-sources',handle(async()=>{
 const [rows]=await require('../config/db').query('SELECT id,title,slug,content,excerpt,cover_image_url AS cover_image,meta_description,created_at,is_published FROM blog_posts ORDER BY created_at DESC');
 const published=await require('../models/contentModel').getByKey('articles');
 const sources=new Map(rows.map(row=>[row.slug,row]));
 for(const article of published?.items||[]){const source=sources.get(article.slug);sources.set(article.slug,{...source,...article,content_text:article.body,is_published:article.enabled?1:0,created_at:source?.created_at||article.date});}
 return [...sources.values()];
}));
router.put('/draft',handle(req=>service().saveDocument({document:req.body.document,expectedVersion:req.body.expectedVersion,actor:req.user.id})));
router.post('/preview',handle(async()=>{
  const state=await service().read();
  const token=require('jsonwebtoken').sign({scope:'website-preview',version:state.version},process.env.JWT_SECRET,{expiresIn:'10m',audience:'website-preview'});
  const base=process.env.PUBLIC_URL;
  if(!base)throw Object.assign(new Error('Configure PUBLIC_URL before using website preview'),{status:503});
  const url=new URL(base);url.searchParams.set('preview',token);
  return {url:url.toString()};
}));
router.put('/draft/:section',handle(req=>service().saveSection({section:req.params.section,content:req.body.content,expectedVersion:req.body.expectedVersion,actor:req.user.id})));
router.post('/publish',handle(req=>service().publish({expectedVersion:req.body.expectedVersion,actor:req.user.id})));
router.post('/restore/:id',handle(req=>service().restore({revisionId:Number(req.params.id),expectedVersion:req.body.expectedVersion,actor:req.user.id})));
module.exports=router;
