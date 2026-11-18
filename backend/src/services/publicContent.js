const fault=(message,status)=>Object.assign(new Error(message),{status});
module.exports=async function publicContent(preview){
 if(!preview)return require('../models/contentModel').getAll();
 if(process.env.WEBSITE_STUDIO_ENABLED!=='true')throw fault('Preview unavailable',404);
 let claims;
 try{claims=require('jsonwebtoken').verify(preview,process.env.JWT_SECRET,{audience:'website-preview'});}catch{throw fault('Preview expired. Open a new preview from the POS.',401);}
 if(claims.scope!=='website-preview')throw fault('Invalid preview',403);
 const state=await require('../models/websiteStudioRepository').createRepository(require('../config/db')).readDraft();
 if(state.version!==claims.version)throw fault('Draft changed. Open a fresh preview from the POS.',409);
 return state.document;
};
