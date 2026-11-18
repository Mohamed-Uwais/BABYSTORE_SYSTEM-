import {useState} from 'react';
import client from '../api/client';
export default function WebsiteImageUpload({onChange}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <div className="my-3"><label className="block text-sm">Upload or replace image<input type="file" disabled={busy} accept="image/jpeg,image/png,image/webp" onChange={async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;setBusy(true);setError('');
  try{const data=new FormData();data.append('file',file);const response=await client.post('/website-studio/media',data);if(response.data.data.type!=='image')throw Error('Choose an image');onChange(response.data.data.url);}
  catch(error){setError(error.response?.data?.message||error.message||'Upload failed');}finally{setBusy(false);}
 }}/></label><p role="status" className="text-sm">{busy?'Uploading…':error}</p></div>;
}
