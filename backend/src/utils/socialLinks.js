const hosts={facebook:['facebook.com','fb.com'],instagram:['instagram.com'],youtube:['youtube.com','youtu.be'],tiktok:['tiktok.com']};
function validateSocialLinks(content){
  const clean={...content};
  if(clean.whatsapp&&!/^[0-9]{9,15}$/.test(clean.whatsapp))throw Object.assign(new Error('Use 9–15 digits for the WhatsApp number, including country code'),{status:400});
  for(const [key,allowed] of Object.entries(hosts)){
    if(!clean[key]||clean[key]==='#'){clean[key]='';continue;}
    let url;try{url=new URL(clean[key]);}catch{throw Object.assign(new Error(`Enter a valid ${key} HTTPS URL`),{status:400});}
    if(url.protocol!=='https:'||url.username||url.password||url.port||!allowed.some(host=>url.hostname===host||url.hostname.endsWith(`.${host}`)))throw Object.assign(new Error(`Enter a valid ${key} HTTPS URL`),{status:400});
    clean[key]=url.toString();
  }
  return clean;
}
module.exports={validateSocialLinks};
