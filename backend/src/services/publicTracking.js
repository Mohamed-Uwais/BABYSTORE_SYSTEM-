const allowed=new Set(['pending','confirmed','processing','packed','shipped','in_transit','out_for_delivery','delivered','completed','cancelled','returned','unknown']);
module.exports=function publicTracking(result,fallback,trackingNumber){
  const candidate=typeof result?.status==='string'?result.status.toLowerCase().replaceAll(' ','_'):'';
  return {status:allowed.has(candidate)?candidate:(allowed.has(fallback)?fallback:'unknown'),courier:'Koombiyo',tracking_number:trackingNumber};
};
