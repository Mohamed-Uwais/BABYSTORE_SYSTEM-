// Framework-independent draft/publication service. The repository supplies a
// transaction-scoped lock; HTTP code never supplies arbitrary SQL identifiers.
const SECTIONS = new Set(['hero','promo_banners','categories','stats','brand_story',
  'testimonials','cta_banner','footer','announcement_bar']);
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
  return JSON.parse(serialized);
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
