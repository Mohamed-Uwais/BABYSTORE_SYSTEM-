
const {cashierBills}=require('../utils/salesAccess');
const unrestricted=user=>['owner','admin'].includes(user?.role);
async function salesScope(req,res,next){
 if(unrestricted(req.user))return next();
 try{req.salesBills=await cashierBills(require('../config/db'));next()}catch(error){next(error)}
}
function requireBill(req,res,next){
 if(unrestricted(req.user)||req.salesBills?.some(row=>Number(row.id)===Number(req.params.id)))return next();
 res.status(403).json({success:false,message:'Owner or administrator access required for this bill'});
}
function visibleBills(rows,query={}){
 let result=rows;
 const search=String(query.q||query.search||'').trim().toLowerCase();
 if(search)result=result.filter(r=>[r.order_number,r.customer_name].some(v=>String(v||'').toLowerCase().includes(search)));
 if(query.status)result=result.filter(r=>r.status===query.status);
 const limit=query.limit==null?result.length:Math.max(0,Math.min(100,Number(query.limit)||0));
 const offset=query.offset==null?Math.max(0,(Number(query.page||1)-1)*limit):Math.max(0,Number(query.offset)||0);
 return result.slice(offset,offset+limit);
}
module.exports={salesScope,requireBill,visibleBills,unrestricted};

