const {test}=require('node:test');
const assert=require('node:assert/strict');
const articles=require('../src/services/websiteArticles');
const {validateSection}=require('../src/services/websiteStudio');
const article={slug:'existing',title:'Edited',body:null,enabled:true,excerpt:'Summary',meta_description:'Description',date:'2026-11-17',media:[],cover_image:''};
test('article overrides retain legacy IDs, URLs and HTML until body is explicitly edited',()=>{
 const base={id:1,slug:'existing',content:'<p>Original</p>',created_at:'2020-01-01',read_time_min:1};
 assert.equal(articles.merge(base,article).content,base.content);
 assert.equal(articles.merge(base,article).id,1);
 assert.equal(articles.merge(base,{...article,body:'<script>literal text</script>'}).content_text,'<script>literal text</script>');
 assert.equal(articles.merge(base,{...article,enabled:false}),null);
 assert.equal(articles.merge(null,article),null);
});
test('article drafts reject duplicate slugs and active-content media URLs',()=>{
 assert.throws(()=>validateSection('articles',{items:[article,article]}));
 assert.throws(()=>validateSection('articles',{items:[{...article,cover_image:'javascript:alert(1)'}]}));
 assert.equal(validateSection('articles',{items:[article]}).items.length,1);
});
