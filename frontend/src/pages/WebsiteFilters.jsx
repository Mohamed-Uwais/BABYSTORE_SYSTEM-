import { useEffect, useState } from 'react';
import client from '../api/client';
import WebsiteMediaEditor from '../components/WebsiteMediaEditor';

export default function WebsiteFilters() {
  const [categories,setCategories]=useState([]), [category,setCategory]=useState('');
  const [definitions,setDefinitions]=useState([]), [version,setVersion]=useState(0), [variants,setVariants]=useState([]);
  const [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const [selected,setSelected]=useState(''), [values,setValues]=useState({});
  const [productContent,setProductContent]=useState(null);
  const productId=variants.find(row=>String(row.id)===selected)?.product_id;
  useEffect(()=>{
    setProductContent(null);if(!productId)return;
    const controller=new AbortController();
    client.get(`/catalog/products/${productId}/content`,{signal:controller.signal}).then(r=>setProductContent(r.data.data)).catch(()=>{if(!controller.signal.aborted)setMessage('Unable to load product content.');});
    return()=>controller.abort();
  },[productId]);
  async function saveProductContent(){
    setBusy(true);try{await client.put(`/catalog/products/${productId}/content`,productContent);setMessage('Product attributes, specifications and media saved.');}catch(error){setMessage(error.response?.data?.message||'Save failed');}finally{setBusy(false);}
  }
  useEffect(()=>{client.get('/catalog/categories').then(r=>setCategories(r.data.data)).catch(()=>setMessage('Unable to load categories.'));},[]);
  useEffect(()=>{
    setDefinitions([]);setVariants([]);setSelected('');setValues({});setMessage('');
    if(!category)return;
    const controller=new AbortController();
    setBusy(true);
    Promise.all([client.get(`/catalog/categories/${category}/filters`,{signal:controller.signal}),client.get(`/catalog/categories/${category}/variants`,{signal:controller.signal})])
      .then(([filters,products])=>{if(!controller.signal.aborted){setDefinitions(filters.data.data.definitions);setVersion(filters.data.data.version);setVariants(products.data.data);}})
      .catch(()=>{if(!controller.signal.aborted)setMessage('Unable to load filters. Please reselect the category.');})
      .finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return()=>controller.abort();
  },[category]);
  async function saveDefinitions(){
    setBusy(true);setMessage('');
    try{const r=await client.put(`/catalog/categories/${category}/filters`,{definitions,expectedVersion:version});setVersion(r.data.data.version);setDefinitions(r.data.data.definitions);setMessage('Category filters saved. Assign options to variants below.');}
    catch(error){setMessage(error.response?.data?.message||'Save failed.');}finally{setBusy(false);}
  }
  async function saveValues(){
    setBusy(true);setMessage('');
    try{const r=await client.put(`/catalog/categories/${category}/variants/${selected}/attributes`,{values});setVariants(rows=>rows.map(row=>String(row.id)===selected?{...row,attribute_values:r.data.data}:row));setMessage('Variant assignments saved.');}
    catch(error){setMessage(error.response?.data?.message||'Save failed.');}finally{setBusy(false);}
  }
  const edit=(index,patch)=>setDefinitions(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row));
  const field='rounded border border-slate-300 bg-white p-2 text-slate-900';
  return <main className="mx-auto max-w-4xl space-y-5 p-6 text-slate-900 dark:text-white">
    <h1 className="text-2xl font-bold">Website category filters</h1>
    <p>Configure relevant attributes, then assign options to each product variant. Stock remains managed through Inventory. Remove existing assignments before deleting an option.</p>
    <label className="block">Category <select className={field} value={category} disabled={busy} onChange={e=>setCategory(e.target.value)}><option value="">Choose category</option>{categories.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    <p role="status">{message || (busy?'Loading…':'')}</p>
    {category && <fieldset disabled={busy} className="space-y-4">
      <legend className="text-xl font-semibold">Filter definitions</legend>
      {definitions.map((def,index)=><div key={index} className="grid gap-2 rounded border p-4 sm:grid-cols-3">
        <label>Stable key<input className={`${field} w-full`} value={def.key} onChange={e=>edit(index,{key:e.target.value})} placeholder="age_group"/></label>
        <label>Display label<input className={`${field} w-full`} value={def.label} onChange={e=>edit(index,{label:e.target.value})} placeholder="Age group"/></label>
        <label>Applies to<select className={field} value={def.scope||'variant'} onChange={e=>edit(index,{scope:e.target.value})}><option value="product">Whole product</option><option value="variant">Individual variant</option></select></label>
        <label>Options (one per line)<textarea className={`${field} w-full`} value={def.options.join('\n')} onChange={e=>edit(index,{options:e.target.value.split('\n')})}/></label>
        <button type="button" className="text-left underline" onClick={()=>setDefinitions(rows=>rows.filter((_,i)=>i!==index))}>Remove attribute</button>
      </div>)}
      <button className="mr-4 underline" type="button" onClick={()=>setDefinitions(rows=>[...rows,{key:'',label:'',options:[]}])}>Add attribute</button>
      <button className="rounded bg-blue-700 p-3 text-white" onClick={saveDefinitions}>Save definitions</button>
      <h2 className="text-xl font-semibold">Variant assignments</h2>
      <label className="block">Product variant <select className={field} value={selected} onChange={e=>{setSelected(e.target.value);setValues(variants.find(row=>String(row.id)===e.target.value)?.attribute_values||{});}}><option value="">Choose variant</option>{variants.map(row=><option key={row.id} value={row.id}>{row.name} — {row.variant_label}</option>)}</select></label>
      {selected && <>{definitions.filter(def=>def.scope!=='product').map(def=><fieldset key={def.key} className="rounded border p-3"><legend>{def.label}</legend>{def.options.map(option=><label key={option} className="mr-4 inline-flex gap-2"><input type="checkbox" checked={values[def.key]?.includes(option)||false} onChange={e=>setValues(old=>({...old,[def.key]:e.target.checked?[...(old[def.key]||[]),option]:(old[def.key]||[]).filter(x=>x!==option)}))}/>{option}</label>)}</fieldset>)}<button className="rounded bg-blue-700 p-3 text-white" onClick={saveValues}>Save variant assignments</button></>}
      {productContent&&<section className="space-y-4 rounded border p-4"><h2 className="text-xl font-semibold">Whole-product content</h2>
        <p>Applies to every variant of this product. No duplicated assignments are needed.</p>
        {definitions.filter(def=>def.scope==='product').map(def=><fieldset key={def.key}><legend>{def.label}</legend>{def.options.map(option=><label key={option} className="mr-4 inline-flex gap-2"><input type="checkbox" checked={productContent.attribute_values[def.key]?.includes(option)||false} onChange={e=>setProductContent(old=>({...old,attribute_values:{...old.attribute_values,[def.key]:e.target.checked?[...(old.attribute_values[def.key]||[]),option]:(old.attribute_values[def.key]||[]).filter(x=>x!==option)}}))}/>{option}</label>)}</fieldset>)}
        <label className="block">Specifications<textarea className={`${field} w-full`} value={productContent.specifications} onChange={e=>setProductContent(old=>({...old,specifications:e.target.value}))}/></label>
        <WebsiteMediaEditor value={productContent.media} endpoint="/catalog/media" onChange={media=>setProductContent(old=>({...old,media}))}/>
        <button className="rounded bg-blue-700 p-3 text-white" onClick={saveProductContent}>Save product content</button>
      </section>}
    </fieldset>}
  </main>;
}
