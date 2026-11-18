const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const sharp=require('sharp');
test('uploaded raster derivatives preserve originals, transparency and responsive dimensions',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'littora-media-test-'));
 try{
  const original=await sharp({create:{width:1400,height:900,channels:4,background:{r:20,g:80,b:160,alpha:0.5}}}).png().toBuffer();
  const result=await require('../src/services/websiteImage').save(original,'fixture','png',path.join(root,'uploads'),path.join(root,'originals'));
  assert.deepEqual(await fs.readFile(path.join(root,'originals/fixture.png')),original);
  assert.equal(result.width,1400);assert.equal(result.height,900);assert.deepEqual(result.srcSet.map(item=>item.width),[480,960,1280,1400]);
  assert.equal((await sharp(await fs.readFile(path.join(root,'uploads/fixture.webp'))).metadata()).hasAlpha,true);
  await assert.rejects(require('../src/services/websiteImage').save(Buffer.from('not an image'),'invalid','png',path.join(root,'uploads'),path.join(root,'originals')),{status:400});
 }finally{
  // This exclusively owns the freshly-created OS temp directory.
  assert.equal(path.dirname(root),os.tmpdir());assert.ok(path.basename(root).startsWith('littora-media-test-'));
  await fs.rm(root,{recursive:true,force:true,maxRetries:3,retryDelay:50});
 }
});
