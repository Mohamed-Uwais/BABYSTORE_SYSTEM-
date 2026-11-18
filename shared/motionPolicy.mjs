export const MOTION_OPTIONS=[{value:'subtle',label:'Standard motion'},{value:'enhanced',label:'Enhanced 3D experience'},{value:'none',label:'Motion off'}];
export function motionPolicy(setting='subtle',systemReduced=false){
  const reduced=!!systemReduced||setting==='none';
  return {reduced,enhanced:!reduced&&setting==='enhanced'};
}
export function pointerDepthAllowed({enhanced,finePointer,saveData=false}){
  return !!enhanced&&!!finePointer&&!saveData;
}
export function depthAngles(x,y,width,height,limit=4){
  const clamp=value=>Math.max(-1,Math.min(1,value));
  if(!(width>0&&height>0))return {x:0,y:0};
  return {x:-clamp(y/height*2-1)*limit,y:clamp(x/width*2-1)*limit};
}
