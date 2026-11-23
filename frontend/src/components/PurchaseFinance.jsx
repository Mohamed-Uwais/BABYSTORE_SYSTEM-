import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../context/AuthContext';
import client from '../api/client';

export default function PurchaseFinance({po,reload}){
 const [staff,setStaff]=useState([]),[payer,setPayer]=useState(''),[account,setAccount]=useState('');
 const [target,setTarget]=useState(''),[method,setMethod]=useState('cash'),[amount,setAmount]=useState('');
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false),[preview,setPreview]=useState(null);
 const {user}=useAuth();
 const [reverseId,setReverseId]=useState(null),[reason,setReason]=useState('');
 async function reverse(e) {
   e.preventDefault();setBusy(true);
   try {
     await client.post('/purchase-orders/'+po.id+'/payments/'+reverseId+'/reverse',{reason});
     setReverseId(null);setReason('');await reload();setStatus('Payment reversed');
   } catch(err){setStatus(err.response?.data?.message||'Reversal failed')} finally {setBusy(false)}
 }
 const key=useRef(null);
 useEffect(()=>{client.get('/purchase-orders/staff').then(r=>setStaff(r.data.data)).catch(()=>setStatus('Could not load registered staff'))},[]);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url)},[preview]);
 const unknownCost=po.items.some(i=>i.unit_cost_price==null);
 const items=po.items.reduce((s,i)=>s+Number(i.unit_cost_price)*i.quantity,0);
 const charges=po.charges||[],payments=po.payments||[];
 const charge=charges.find(c=>String(c.id)===target);
 const obligation=charge?Number(charge.amount):items+Number(po.transport_charge);
 const paid=payments.filter(p=>!p.reversed_at && String(p.charge_id??'')===target).reduce((s,p)=>s+Number(p.amount),0);
 const remaining=Math.round((obligation-paid)*100)/100;
 const money=n=>'Rs. '+Number(n).toFixed(2);
 async function pay(e){
   e.preventDefault();setBusy(true);
   const payment={charge_id:charge?.id??null,method,account,paid_by:Number(payer),amount:Math.round(Number(amount)*100)};
   const signature=JSON.stringify(payment);
   if(key.current?.signature!==signature)key.current={signature,key:crypto.randomUUID()};
   try{await client.post('/purchase-orders/'+po.id+'/payments',{...payment,key:key.current.key});setAmount('');key.current=null;await reload();setStatus('Payment recorded')}
   catch(err){setStatus(err.response?.data?.message||'Payment failed')}finally{setBusy(false)}
 }
 async function view(){
   try{const r=await client.get('/purchase-orders/'+po.id+'/invoice',{responseType:'blob'});setPreview({url:URL.createObjectURL(r.data),mime:r.data.type})}catch{setStatus('No invoice available')}
 }
 return <section className="space-y-3 rounded-xl border p-4"><h2>Supplier invoice and payments</h2>
 {po.invoice_reference && <p>Invoice {po.invoice_reference} · {po.invoice_date?.slice(0,10)}</p>}
 <p>Merchandise {unknownCost ? 'Cost entry incomplete' : money(items)} · Supplier transport {money(po.transport_charge)} · Receipt charges {money(charges.reduce((s,c)=>s+Number(c.amount),0))}</p>
 <form className="flex flex-wrap items-center gap-3" onSubmit={pay}>
 <label>Payable <select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Supplier invoice</option>{charges.map(c=><option key={c.id} value={c.id}>{c.description} · {c.payee}</option>)}</select></label>
 {(charge||(!unknownCost && po.finance_tracked && po.status!=='placed')) ? <p>Total {money(obligation)} · Previously paid {money(paid)} · Balance after payment {money(remaining-Number(amount))}</p>:<p>{po.status==='placed'?'Confirm invoice costs before payment.':'Historical supplier payments require reconciliation.'}</p>}
 <label>Payment now <input type="number" min=".01" step=".01" max={remaining} required value={amount} onChange={e=>setAmount(e.target.value)}/></label>
 <label>Method <select value={method} onChange={e=>setMethod(e.target.value)}>{['cash','card','bank'].map(m=><option key={m}>{m}</option>)}</select></label>
 <label>Paying account <input required maxLength={100} value={account} onChange={e=>setAccount(e.target.value)}/></label>
 <label>Paid by <select required value={payer} onChange={e=>setPayer(e.target.value)}><option value="">Select staff</option>{staff.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}</select></label>
 <button disabled={busy||(!charge&&(!po.finance_tracked||po.status==='placed'))}>Record payment</button></form>
 {payments.map(p=><p key={p.id}>{p.created_at.slice(0,10)} · Paid by {p.payer} · Recorded by {p.operator_name} · {p.method} · {p.account} · {money(p.amount)} {p.reversed_at ? <span>Reversed by {p.reverser} · {p.reversal_reason}</span> : user?.role==='owner' && <button onClick={()=>{setReverseId(p.id);setReason('')}}>Reverse payment</button>}</p>)}
 {reverseId && <form onSubmit={reverse}><label>Reason for reversing payment #{reverseId} <input value={reason} onChange={e=>setReason(e.target.value)} required maxLength={500}/></label>
 <button disabled={busy}>Confirm reversal</button><button type="button" onClick={()=>setReverseId(null)}>Cancel</button></form>}
 <label>Attach invoice <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;const fd=new FormData();fd.append('invoice',file);try{await client.post('/purchase-orders/'+po.id+'/invoice',fd);setPreview(null);setStatus('Invoice saved')}catch{setStatus('Invoice upload failed')}}}/></label>
 <button onClick={view}>View saved invoice</button>
 {preview && <div>{preview.mime==='application/pdf'?<iframe title="Invoice" src={preview.url}/>:<img alt="Supplier invoice" className="max-h-96" src={preview.url}/>}<a href={preview.url} download={'invoice-'+po.po_number}>Download invoice</a></div>}
 {status&&<p role="status">{status}</p>}</section>
}
