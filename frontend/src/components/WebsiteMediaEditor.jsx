import {useState} from 'react';
import client from '../api/client';
export default function WebsiteMediaEditor({value=[],onChange,endpoint='/website-studio/media'}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const update=(index,patch)=>onChange(value.map((item,i)=>i===index?{...item,...patch}:item));
  async function upload(file,index,poster=false){
    if(!file)return;setBusy(true);setError('');
    try{const form=new FormData();form.append('file',file);const response=await client.post(endpoint,form);
      const item=response.data.data;
      if(poster&&item.type!=='image')throw Error('Select an image for the poster');
      if(index===null)onChange([...value,{type:item.type,src:item.url,width:item.width,height:item.height,srcSet:item.srcSet||[],alt:'',poster:'',enabled:true,autoplay:false,loop:false}]);
      else update(index,poster?{poster:item.url}:{type:item.type,src:item.url,width:item.width,height:item.height,srcSet:item.srcSet||[]});
    }catch(err){setError(err.response?.data?.message||err.message||'Upload failed');}finally{setBusy(false);}
  }
  return <fieldset disabled={busy} className="space-y-3"><legend className="font-semibold">Images and videos</legend>
    <p className="text-sm">Images: JPEG, PNG or WebP, up to 5 MB. Videos: MP4 or WebM, up to 30 MB. Uploaded raster images receive WebP delivery sizes; originals are retained. Save the content after uploading.</p>
    {value.map((item,index)=><div key={index} className="space-y-2 rounded border p-3">
      <p className="break-all text-xs">{item.type}: {item.src}</p>
      <label className="block">Description / alternative text<input className="ml-2 rounded border p-2 text-slate-900" value={item.alt||''} onChange={e=>update(index,{alt:e.target.value})}/></label>
      <label className="mr-4"><input type="checkbox" checked={item.enabled!==false} onChange={e=>update(index,{enabled:e.target.checked})}/> Enabled</label>
      {item.type==='video'&&<><label className="mr-4"><input type="checkbox" checked={!!item.autoplay} onChange={e=>update(index,{autoplay:e.target.checked})}/> Muted autoplay when visible</label><label><input type="checkbox" checked={!!item.loop} onChange={e=>update(index,{loop:e.target.checked})}/> Loop</label><label className="block">Poster image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>upload(e.target.files[0],index,true)}/></label></>}
      <label className="block">Replace file<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>upload(e.target.files[0],index)}/></label>
      <div className="flex gap-4"><button type="button" disabled={index===0} onClick={()=>{const next=[...value];[next[index-1],next[index]]=[next[index],next[index-1]];onChange(next);}}>Move up</button><button type="button" disabled={index===value.length-1} onClick={()=>{const next=[...value];[next[index+1],next[index]]=[next[index],next[index+1]];onChange(next);}}>Move down</button><button type="button" onClick={()=>onChange(value.filter((_,i)=>i!==index))}>Remove from content</button></div>
    </div>)}
    <label className="block">Add media<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e=>{upload(e.target.files[0],null);e.target.value='';}}/></label>
    <p role="status">{busy?'Uploading…':error}</p>
  </fieldset>;
}
