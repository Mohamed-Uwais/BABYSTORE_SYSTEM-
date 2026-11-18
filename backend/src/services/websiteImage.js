const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
// Preserve originals outside the public uploads directory. Only raster formats
// already validated by websiteMediaUpload reach this decoder.
async function save(bytes,name,extension,uploads,originals){
 const files=[];
 try{
  const input=sharp(bytes,{limitInputPixels:40000000,failOn:'warning'});
  const metadata=await input.metadata();
  if(!['jpeg','png','webp'].includes(metadata.format))throw Error('Unsupported image format');
  await fs.mkdir(originals,{recursive:true});await fs.mkdir(uploads,{recursive:true});
  const original=path.join(originals,`${name}.${extension}`);await fs.writeFile(original,bytes,{flag:'wx'});files.push(original);
  if((metadata.pages||1)>1){
   const filename=`${name}.${extension}`,file=path.join(uploads,filename);await fs.writeFile(file,bytes,{flag:'wx'});files.push(file);
   return {url:`/uploads/${filename}`,width:metadata.width,height:metadata.pageHeight||metadata.height,srcSet:[],files};
  }
  const {data,info}=await input.rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer({resolveWithObject:true});
  const file=path.join(uploads,`${name}.webp`);await fs.writeFile(file,data,{flag:'wx'});files.push(file);
  const srcSet=[];
  for(const width of [480,960,1280].filter(width=>width<info.width)){
   const filename=`${name}-${width}.webp`,target=path.join(uploads,filename);
   await sharp(data).resize({width,withoutEnlargement:true}).webp({quality:82}).toFile(target);files.push(target);
   srcSet.push({src:`/uploads/${filename}`,width});
  }
  const url=`/uploads/${name}.webp`;srcSet.push({src:url,width:info.width});
  return {url,width:info.width,height:info.height,srcSet,files};
 }catch(error){await Promise.all(files.map(file=>fs.unlink(file).catch(()=>{})));throw Object.assign(new Error('Image could not be decoded safely. Use a valid image up to 40 megapixels.'),{status:400,cause:error});}
}
module.exports={save};
