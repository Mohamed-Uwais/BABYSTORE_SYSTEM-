module.exports=function createTrackingLimiter({now=Date.now,limit=30,windowMs=60000}={}){
 const attempts=new Map();
 return (req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  const time=now();
  for(const [key,entry] of attempts)if(entry.until<=time)attempts.delete(key);
  const key=req.ip||'unknown',entry=attempts.get(key)||{count:0,until:time+windowMs};
  if(entry.count>=limit||(!attempts.has(key)&&attempts.size>=10000)){
   res.setHeader('Retry-After',String(Math.max(1,Math.ceil((entry.until-time)/1000))));
   return res.status(429).json({success:false,message:'Too many tracking requests. Try again in one minute.'});
  }
  entry.count++;attempts.set(key,entry);next();
 };
};
