import { useState } from 'react';
import JsBarcode from 'jsbarcode';
import client from '../api/client';

const dimensions = [
  ['width','Label width (mm)',25,200,60], ['height','Label height (mm)',15,150,40],
  ['gap','Gap (mm)',0,20,2], ['margin','Sheet margin (mm)',0,25,2], ['columns','Labels across',1,8,1],
];
export default function LabelSettings({form,update}) {
  const [products,setProducts]=useState([]);
  const [counts,setCounts]=useState({});
  const [error,setError]=useState('');
  function preview(calibrate) {
    setError('');
    let win;
    try {
      const [w,h,g,m,c]=dimensions.map(([key,,min,max,initial])=>{
        const n=form['label_'+key]??initial;
        if(!Number.isInteger(n)||n<min||n>max) throw Error('Check the sheet dimensions.');
        return n;
      });
      const rows=calibrate?[{sku:'CAL-01',name:'Calibration',qty:c*2}]:products.map(p=>({...p,qty:Number(counts[p.variant_id])||0})).filter(p=>p.qty);
      if(!rows.length || rows.some(p=>!Number.isInteger(p.qty)||p.qty<1)||rows.reduce((sum,p)=>sum+p.qty,0)>500) throw Error('Choose between 1 and 500 labels.');
      win=window.open('','_blank');
      if(!win) throw Error('Allow pop-ups to preview the labels.');
      const doc=win.document;
      doc.title=calibrate?'Calibration sheet':'Barcode labels';
      const style=doc.createElement('style');
      style.textContent='@page{margin:0}*{box-sizing:border-box}body{margin:0;font:10pt Arial}main{display:grid;width:max-content;grid-template-columns:repeat('+c+','+w+'mm);gap:'+g+'mm;padding:'+m+'mm}article{width:'+w+'mm;height:'+h+'mm;padding:1mm;display:grid;align-content:center;justify-items:center;overflow-wrap:anywhere;text-align:center;break-inside:avoid;'+(calibrate?'outline:1px dashed gray;outline-offset:-1px;':'')+'}svg{display:block}@media print{button{display:none}}';
      doc.head.append(style);
      const sheet=doc.createElement('main'); doc.body.append(sheet);
      for(const row of rows) {
        const label=doc.createElement('article');
        const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
        JsBarcode(svg,String(row.barcode||row.sku),{format:'CODE128',width:1,height:38,displayValue:false,margin:10});
        const modules=parseFloat(svg.getAttribute('width'));
        const moduleWidth=Math.min(.4,(w-2)/modules);
        if(moduleWidth<.25) throw Error('Increase label width for SKU '+row.sku);
        svg.style.width=modules*moduleWidth+'mm'; svg.style.height='auto';label.append(svg);
        const lines=[row.sku];
        if(form.label_name??1) lines.push([row.name,row.variant_label].filter(Boolean).join(' / '));
        if((form.label_price??1)&&row.retail_price!=null) lines.push('Rs. '+Number(row.retail_price).toFixed(2));
        for(const line of lines){const span=doc.createElement('span');span.textContent=line;label.append(span)}
        sheet.append(label);
        if(label.scrollHeight>label.clientHeight+1 || label.scrollWidth>label.clientWidth+1) throw Error('Increase label dimensions or hide optional fields for '+row.sku);
        for(let i=1;i<row.qty;i++) sheet.append(label.cloneNode(true));
      }
      const button=doc.createElement('button');button.textContent='Print at 100%';button.onclick=()=>win.print();doc.body.prepend(button);
    } catch(e){win?.close();setError(String(e.message||e))}
  }
  return <fieldset className="space-y-2"><legend>Barcode labels</legend>
    {dimensions.map(([k,title,min,max,value])=><label className="block" key={k}>{title} <input type="number" min={min} max={max} required value={form['label_'+k]??value} onChange={e=>update('label_'+k,e.target.valueAsNumber)} /></label>)}
    {['name','price'].map(k=><label className="block" key={k}><input type="checkbox" checked={Boolean(form['label_'+k]??1)} onChange={e=>update('label_'+k,Number(e.target.checked))}/> Print {k==='name'?'product and variant':'selling price'}</label>)}
    <button type="button" onClick={async()=>{try{const r=await client.get('/settings/label-variants');setProducts(r.data.data.filter(p=>p.sku));setError('')}catch{setError('Could not load variants.')}}}>Select variants</button>
    {products.map(p=><label key={p.variant_id} className="block">{p.name} · {p.sku} <input aria-label={'Copies of '+p.sku} type="number" min="0" max="500" value={counts[p.variant_id]??0} onChange={e=>setCounts({...counts,[p.variant_id]:e.target.value})}/></label>)}
    <div><button type="button" onClick={()=>preview(false)}>Preview labels</button> · <button type="button" onClick={()=>preview(true)}>Calibration sheet</button></div>
    {error && <p role="alert">{error}</p>}
  </fieldset>
}

