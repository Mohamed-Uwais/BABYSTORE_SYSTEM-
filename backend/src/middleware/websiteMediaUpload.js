const multer=require('multer');
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:30*1024*1024,files:1}}).single('file');
async function save(req,res,next){
  try{
    const bytes=req.file?.buffer;if(!bytes)throw Object.assign(new Error('Select a media file'),{status:400});
    let ext;
    if(bytes.subarray(0,3).equals(Buffer.from([255,216,255])))ext='jpg';
    else if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext='png';
    else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')ext='webp';
    else if(bytes.toString('ascii',4,8)==='ftyp')ext='mp4';
    else if(bytes.subarray(0,4).equals(Buffer.from([26,69,223,163])))ext='webm';
    if(!ext)throw Object.assign(new Error('Use JPEG, PNG, WebP, MP4 or WebM'),{status:400});
    if(!['mp4','webm'].includes(ext)&&bytes.length>5*1024*1024)throw Object.assign(new Error('Images must be at most 5 MB'),{status:400});
    const name=`media-${randomUUID()}`;
    const filename=`${name}.${ext}`;
    const directory=path.resolve(__dirname,'../../uploads');await fs.mkdir(directory,{recursive:true});
    if(!['mp4','webm'].includes(ext)){
      const {files,...result}=await require('../services/websiteImage').save(bytes,name,ext,directory,path.resolve(__dirname,'../../storage/website-originals'));
      return res.json({success:true,data:{...result,type:'image'}});
    }
    await fs.writeFile(path.join(directory,filename),bytes,{flag:'wx'});
    res.json({success:true,data:{url:`/uploads/${filename}`,type:['mp4','webm'].includes(ext)?'video':'image'}});
  }catch(error){next(error);}
}
module.exports={upload,save};
