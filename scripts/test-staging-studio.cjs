const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const db=await require('./staging-connection.cjs').connect();
  const [draftBefore]=await db.query('SELECT * FROM website_studio_draft WHERE id=1');
  let token,userId,uploadedFile,originalFile;
  const api=async(route,method='GET',body,auth=false)=>{
    const response=await fetch(`http://127.0.0.1:15001/api${route}`,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
    return {status:response.status,...await response.json()};
  };
  let publishedBefore;
  try{
    const account=await require('./staging-test-user.cjs').create(db);userId=account.id;
    token=(await api('/auth/login','POST',account)).data.token;
    const upload=async(blob,name)=>{const form=new FormData();form.append('file',blob,name);const response=await fetch('http://127.0.0.1:15001/api/website-studio/media',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});return {status:response.status,...await response.json()};};
    assert.equal((await upload(new Blob(['<html>not an image</html>'],{type:'image/png'}),'fake.png')).status,400);
    const media=await upload(new Blob([fs.readFileSync(path.resolve(__dirname,'../website/public/favicon.png'))],{type:'image/png'}),'test.png');
    assert.equal(media.status,200);assert.match(media.data.url,/^\/uploads\/media-[a-f0-9-]+\.webp$/);uploadedFile=path.resolve(__dirname,'../backend/uploads',path.basename(media.data.url));originalFile=path.resolve(__dirname,'../backend/storage/website-originals',path.basename(media.data.url,'.webp')+'.png');
    assert.equal(media.data.width,64);assert.equal(media.data.height,64);
    publishedBefore=(await api('/public/content')).data;
    assert.equal((await api('/website-studio/draft')).status,401);
    const original=(await api('/website-studio/draft','GET',null,true)).data;
    const hero={...(original.document.hero||{}),headline_1:`LOCAL TEST draft ${Date.now()}`};
    const saved=await api('/website-studio/draft','PUT',{document:{hero,appearance:{palette:'ocean',density:'comfortable',motion:'enhanced'},articles:{items:[{slug:'local-test-article',title:'Local test article',body:'Plain text <script>not executable</script>',excerpt:'Test excerpt',meta_description:'Test description',date:'2026-11-17',enabled:true,media:[],cover_image:''}]}},expectedVersion:original.version},true);
    assert.equal(saved.status,200);
    assert.deepEqual((await api('/public/content')).data,publishedBefore);
    const preview=await api('/website-studio/preview','POST',{},true);
    assert.equal(preview.status,200);
    const previewToken=new URL(preview.data.url).searchParams.get('preview');
    const previewContent=await api(`/public/content?preview=${encodeURIComponent(previewToken)}`);
    assert.equal(previewContent.data.hero.headline_1,hero.headline_1);
    assert.equal(previewContent.data.appearance.motion,'enhanced');
    assert.equal((await api('/public/content?preview=invalid')).status,401);
    assert.equal((await api('/public/blog/local-test-article')).status,404);
    assert.ok(!(await (await fetch('http://127.0.0.1:15001/api/public/sitemap.xml')).text()).includes('/blog/local-test-article'));
    const articlePreview=await api(`/public/blog/local-test-article?preview=${encodeURIComponent(previewToken)}`);
    assert.equal(articlePreview.status,200);assert.equal(articlePreview.data.content_text,'Plain text <script>not executable</script>');

    const published=await api('/website-studio/publish','POST',{expectedVersion:saved.data.version},true);
    assert.equal(published.status,200);
    assert.equal((await api('/public/content')).data.hero.headline_1,hero.headline_1);
    assert.equal((await api('/public/content')).data.appearance.motion,'enhanced');
    assert.equal((await api('/public/blog/local-test-article')).status,200);
    assert.ok((await (await fetch('http://127.0.0.1:15001/api/public/sitemap.xml')).text()).includes('/blog/local-test-article'));
    assert.equal((await api(`/public/content?preview=${encodeURIComponent(previewToken)}`)).status,409);
    const revisions=(await api('/website-studio/revisions','GET',null,true)).data;
    const previous=revisions.find(row=>row.action==='before_publish');
    const restored=await api(`/website-studio/restore/${previous.id}`,'POST',{expectedVersion:published.data.version},true);
    assert.equal(restored.status,200);
    assert.equal((await api('/public/content')).data.hero.headline_1,hero.headline_1,'restore must not publish');
    assert.equal((await api('/website-studio/publish','POST',{expectedVersion:restored.data.version},true)).status,200);
    assert.deepEqual((await api('/public/content')).data,publishedBefore);
    const state=(await api('/website-studio/draft','GET',null,true)).data;
    const invalid=await api('/website-studio/draft/footer','PUT',{content:{instagram:'javascript:alert(1)'},expectedVersion:state.version},true);
    assert.equal(invalid.status,400);
    console.log('PASS: authenticated draft save, public isolation, signed preview, invalid/stale preview rejection, publish, revision restore requiring publication, social URL validation. Original test content restored.');
  }finally{
   try {
    // Restore local test documents even if an assertion fails; remove only this disposable actor's test revisions.
    if(publishedBefore){
      await db.beginTransaction();
      try{
        await db.query('DELETE FROM website_content');
        for(const [key,value] of Object.entries(publishedBefore))await db.query('INSERT INTO website_content (section_key,content) VALUES (?,?)',[key,JSON.stringify(value)]);
        if(draftBefore.length){const old=draftBefore[0];await db.query('UPDATE website_studio_draft SET document=?,version=?,updated_by=? WHERE id=1',[typeof old.document==='string'?old.document:JSON.stringify(old.document),old.version,old.updated_by]);}
        else await db.query('DELETE FROM website_studio_draft WHERE id=1');
        await db.commit();
      }catch(error){await db.rollback();throw error;}
    }
    if(userId){await db.query('DELETE FROM website_studio_revisions WHERE created_by=?',[userId]);await db.query('DELETE FROM users WHERE id=?',[userId]);}
    if(uploadedFile)fs.unlinkSync(uploadedFile);
    if(originalFile)fs.unlinkSync(originalFile);
   } finally {await db.end();}
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
