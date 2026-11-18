function error(message){throw Object.assign(new Error(message),{status:400});}
function url(value){
  if(!value)return '';
  if(typeof value!=='string'||value.length>1000)error('Invalid media URL');
  if(/^\/uploads\/[a-zA-Z0-9_.-]+$/.test(value))return value;
  let parsed;try{parsed=new URL(value);}catch{error('Use an uploaded file or HTTPS media URL');}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password)error('Use an HTTPS media URL without credentials');
  return parsed.href;
}
function media(input){
  if(!Array.isArray(input)||input.length>20)error('Use at most 20 media items');
  return input.map(item=>{
    if(!item||!['image','video'].includes(item.type))error('Choose image or video');
    const src=url(item.src);if(!src)error('Choose a media file');
    if(item.type==='video'&&!/\.(mp4|webm)(?:\?|$)/i.test(src))error('Use an MP4 or WebM video');
    const dimensions={};
    for(const key of ['width','height'])if(Number.isSafeInteger(item[key])&&item[key]>0&&item[key]<=40000)dimensions[key]=item[key];
    const srcSet=Array.isArray(item.srcSet)?item.srcSet.slice(0,4).map(entry=>{
      if(!Number.isSafeInteger(entry.width)||entry.width<1||entry.width>40000)error('Invalid responsive image size');
      return {src:url(entry.src),width:entry.width};
    }):[];
    return {type:item.type,src,poster:url(item.poster),...dimensions,srcSet,alt:String(item.alt||'').slice(0,300),enabled:item.enabled!==false,autoplay:item.autoplay===true,loop:item.loop===true};
  });
}
module.exports={media,url};
