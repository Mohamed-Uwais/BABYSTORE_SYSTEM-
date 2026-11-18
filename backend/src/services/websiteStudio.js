// Framework-independent draft/publication service. The repository supplies a
// transaction-scoped lock; HTTP code never supplies arbitrary SQL identifiers.
const SECTIONS = new Set(['hero','promo_banners','categories','stats','brand_story',
  'testimonials','cta_banner','footer','announcement_bar','pages','homepage','navigation','appearance','articles']);
const HOME=['hero','offers','categories','featured','story','testimonials','offer_banner','new_arrivals','blog','closing'];
const PAGES=['about','contact','track','blog','faq','privacy','returns','shipping','terms'];
function fault(message,status=400){return Object.assign(new Error(message),{status});}
function version(value){
  if(!Number.isSafeInteger(value)||value<0)throw fault('A valid draft version is required');
  return value;
}
function validateSection(key,value){
  if(!SECTIONS.has(key))throw fault('Unsupported website section');
  if(!value||Array.isArray(value)||typeof value!=='object')throw fault('Section content must be an object');
  const visit=(v,depth)=>{
    if(depth>12)throw fault('Content is nested too deeply');
    if(v&&typeof v==='object')for(const [k,x] of Object.entries(v)){
      if(['__proto__','prototype','constructor'].includes(k))throw fault('Invalid content field');
      visit(x,depth+1);
    }
    else if(!['string','number','boolean'].includes(typeof v)&&v!==null)throw fault('Invalid content value');
  };
  visit(value,0);
  const serialized=JSON.stringify(value);
  if(Buffer.byteLength(serialized,'utf8')>65536)throw fault('Section content exceeds 64 KB');
  const clean=JSON.parse(serialized);
  if(key==='hero'&&clean.media)clean.media=require('./websiteMedia').media(clean.media);
  if(key==='articles'){
    if(!Array.isArray(clean.items)||clean.items.length>50||new Set(clean.items.map(x=>x?.slug)).size!==clean.items.length)throw fault('Use up to 50 unique managed article URLs');
    for(const article of clean.items){
      if(!article||typeof article.slug!=='string'||!/^[a-z0-9-]{1,220}$/.test(article.slug)||typeof article.title!=='string'||!article.title.trim()||article.title.length>200||typeof article.enabled!=='boolean')throw fault('Article needs a title, stable URL and visibility');
      if(article.body!==null&&(typeof article.body!=='string'||article.body.length>30000))throw fault('Article body must be plain text up to 30,000 characters');
      if(typeof article.excerpt!=='string'||article.excerpt.length>1000||typeof article.meta_description!=='string'||article.meta_description.length>300||!/^\d{4}-\d{2}-\d{2}$/.test(article.date)||!Number.isFinite(Date.parse(article.date)))throw fault('Invalid article summary, description or date');
      article.media=require('./websiteMedia').media(article.media||[]);
      if(article.cover_image&&!/^\/images\/[a-zA-Z0-9_./-]+$/.test(article.cover_image))article.cover_image=require('./websiteMedia').url(article.cover_image);
    }
  }
  if(key==='pages')for(const [name,page] of Object.entries(clean)){
    if(!PAGES.includes(name)||!page||typeof page!=='object')throw fault('Unsupported page');
    if(typeof page.title!=='string'||page.title.length>200||typeof page.body!=='string'||page.body.length>30000)throw fault('Page text exceeds supported length');
    if(page.meta_description!==undefined&&(typeof page.meta_description!=='string'||page.meta_description.length>300))throw fault('Search description must be at most 300 characters');
    page.media=require('./websiteMedia').media(page.media||[]);
    if(!Array.isArray(page.faqs)||page.faqs.length>40||page.faqs.some(item=>typeof item.question!=='string'||typeof item.answer!=='string'||item.question.length>300||item.answer.length>4000))throw fault('Invalid FAQs');
  }
  if(key==='homepage'){
    if(!Array.isArray(clean.sections)||clean.sections.length!==HOME.length||new Set(clean.sections.map(x=>x.key)).size!==HOME.length||clean.sections.some(x=>!HOME.includes(x.key)||typeof x.enabled!=='boolean'))throw fault('Homepage must include each supported section once');
    for(const section of clean.sections)for(const key of ['label','title','subtitle'])if(section[key]!==undefined&&(typeof section[key]!=='string'||section[key].length>300))throw fault('Section text must be at most 300 characters');
    if(!Array.isArray(clean.featured_slugs)||clean.featured_slugs.length>24||clean.featured_slugs.some(slug=>typeof slug!=='string'||!/^[a-z0-9-]+$/.test(slug)))throw fault('Use up to 24 valid product slugs');
  }
  if(key==='navigation'){
    const routes=['/','/shop','/blog','/about','/contact','/track','/faq',...['privacy','returns','shipping','terms'].map(x=>`/policies/${x}`),...HOME.map(x=>`/#${x}`)];
    if(!Array.isArray(clean.items)||clean.items.length>16||clean.items.some(x=>!x||typeof x.label!=='string'||!x.label.trim()||x.label.length>50||!routes.includes(x.to)))throw fault('Choose a supported destination and navigation label');
  }
  if(key==='appearance'&&(!['ocean','botanical','rose'].includes(clean.palette)||!['subtle','enhanced','none'].includes(clean.motion)||!['comfortable','compact'].includes(clean.density)))throw fault('Choose supported appearance presets');
  return key==='footer' ? require('../utils/socialLinks').validateSocialLinks(clean) : clean;
}
function createStudio(repository){
  async function change(expected,actor,operation){
    version(expected);
    return repository.transaction(async tx=>{
      const state=await tx.lockDraft();
      if(state.version!==expected)throw fault('Content changed in another session. Reload before saving.',409);
      return operation(tx,state,actor);
    });
  }
  return {
    read:()=>repository.readDraft(),
    revisions:()=>repository.revisions(),
    saveDocument:({document,expectedVersion,actor})=>{
      if(!document||Array.isArray(document)||typeof document!=='object')throw fault('Draft must be an object');
      const clean=Object.fromEntries(Object.entries(document).map(([key,value])=>[key,validateSection(key,value)]));
      return change(expectedVersion,actor,async(tx,state,user)=>{
        const merged={...state.document,...clean};
        await tx.writeDraft(merged,state.version+1,user);
        return {document:merged,version:state.version+1};
      });
    },
    saveSection:({section,content,expectedVersion,actor})=>{
      const clean=validateSection(section,content);
      return change(expectedVersion,actor,async(tx,state,user)=>{
        const document={...state.document,[section]:clean};
        await tx.writeDraft(document,state.version+1,user);
        return {document,version:state.version+1};
      });
    },
    publish:({expectedVersion,actor})=>change(expectedVersion,actor,async(tx,state,user)=>{
      // Save the previous published content too, including the first pre-Studio state.
      await tx.addRevision(await tx.readPublished(),state.version,'before_publish',user);
      await tx.publish(state.document);
      await tx.addRevision(state.document,state.version,'publish',user);
      await tx.writeDraft(state.document,state.version+1,user);
      return {document:state.document,version:state.version+1};
    }),
    restore:({revisionId,expectedVersion,actor})=>{
      if(!Number.isSafeInteger(revisionId)||revisionId<1)throw fault('Invalid revision');
      return change(expectedVersion,actor,async(tx,state,user)=>{
        const revision=await tx.getRevision(revisionId);
        if(!revision)throw fault('Revision not found',404);
        // Restore to draft only. A separate explicit publish is required.
        await tx.writeDraft(revision.document,state.version+1,user);
        return {document:revision.document,version:state.version+1};
      });
    }
  };
}
module.exports={createStudio,validateSection};
