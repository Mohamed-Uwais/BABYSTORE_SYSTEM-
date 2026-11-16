const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createStudio,validateSection}=require('../src/services/websiteStudio');
const {createRepository}=require('../src/models/websiteStudioRepository');
function memory(){
  let value={draft:{hero:{headline:'Original'},footer:{phone:'123'}},version:0,published:{hero:{headline:'Original'},footer:{phone:'123'}},revisions:[]};
  let queue=Promise.resolve();
  const copy=x=>structuredClone(x);
  const repository={
    readDraft:async()=>({document:copy(value.draft),version:value.version}),
    revisions:async()=>copy(value.revisions),
    transaction(fn){const run=queue.then(async()=>{const before=copy(value);try{return await fn({
      lockDraft:async()=>({document:copy(value.draft),version:value.version}),
      writeDraft:async(d,v)=>{value.draft=copy(d);value.version=v;},
      readPublished:async()=>copy(value.published),
      publish:async d=>{value.published=copy(d);},
      addRevision:async(d,v,action)=>value.revisions.push({id:value.revisions.length+1,document:copy(d),action}),
      getRevision:async id=>value.revisions.find(r=>r.id===id)
    });}catch(e){value=before;throw e;}});queue=run.catch(()=>{});return run;}
  };
  return {studio:createStudio(repository),get:()=>copy(value)};
}
test('saving a section preserves other sections and leaves published content unchanged',async()=>{
  const m=memory();const saved=await m.studio.saveSection({section:'hero',content:{headline:'Draft'},expectedVersion:0,actor:1});
  assert.equal(saved.version,1);assert.equal(saved.document.footer.phone,'123');
  assert.equal(m.get().published.hero.headline,'Original');
});
test('two sessions cannot overwrite the same draft version',async()=>{
  const m=memory();const results=await Promise.allSettled(['One','Two'].map(headline=>m.studio.saveSection({section:'hero',content:{headline},expectedVersion:0})));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
});
test('publication records previous state; restore requires another explicit publication',async()=>{
  const m=memory();await m.studio.saveSection({section:'hero',content:{headline:'New'},expectedVersion:0});
  const published=await m.studio.publish({expectedVersion:1,actor:1});
  assert.equal(published.version,2);assert.equal(m.get().published.hero.headline,'New');
  await m.studio.restore({revisionId:1,expectedVersion:2});
  assert.equal((await m.studio.read()).document.hero.headline,'Original');
  assert.equal(m.get().published.hero.headline,'New');
  await assert.rejects(m.studio.publish({expectedVersion:1}),e=>e.status===409);
});
test('invalid sections, versions and unsafe/oversized documents are rejected',async()=>{
  for(const content of [null,[],{text:'x'.repeat(65537)},JSON.parse('{"__proto__":{}}')])assert.throws(()=>validateSection('hero',content),e=>e.status===400);
  assert.throws(()=>validateSection('orders',{}));
  const m=memory();await assert.rejects(m.studio.publish({expectedVersion:'0'}),e=>e.status===400);
});
test('database adapter rolls back failed publication and always releases connection',async()=>{
  const calls=[];const connection={beginTransaction:async()=>calls.push('begin'),commit:async()=>calls.push('commit'),rollback:async()=>calls.push('rollback'),release:()=>calls.push('release'),query:async()=>{throw Error('storage unavailable')}};
  const repository=createRepository({getConnection:async()=>connection});
  await assert.rejects(repository.transaction(tx=>tx.publish({hero:{headline:'New'}})),/storage unavailable/);
  assert.deepEqual(calls,['begin','rollback','release']);
});
