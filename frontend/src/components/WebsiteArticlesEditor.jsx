import {useEffect,useState} from 'react';
import client from '../api/client';
import WebsiteMediaEditor from './WebsiteMediaEditor';
export default function WebsiteArticlesEditor({content,setContent}){
 const [sources,setSources]=useState([]),[error,setError]=useState('');
 const articles=content.articles?.items||[];
 useEffect(()=>{client.get('/website-studio/article-sources').then(r=>setSources(r.data.data)).catch(()=>setError('Unable to load existing articles. Reload before editing them.'));},[]);
 const write=items=>setContent(old=>({...old,articles:{items}}));
 const edit=(index,patch)=>write(articles.map((article,i)=>i===index?{...article,...patch}:article));
 const create=source=>({slug:source?.slug||'',title:source?.title||'New article',body:source?.content_text??(source?null:''),excerpt:source?.excerpt||'',meta_description:source?.meta_description||'',cover_image:source?.cover_image||'',media:source?.media||[],enabled:source?!!source.is_published:true,date:(source?.created_at||new Date().toISOString()).slice(0,10)});
 const field='mt-1 w-full rounded border border-slate-300 bg-white p-2 text-slate-900';
 return <section className="space-y-4 rounded-xl border bg-white p-5 text-slate-900">
  <h2 className="text-xl font-semibold">Blog articles</h2>
  <p className="text-sm">Save all drafts and preview the Blog before publishing. Existing URLs are retained. New body text uses paragraphs; an untouched legacy article keeps its original formatting. Disable an article to hide it.</p>
  {error&&<p role="alert">{error}</p>}
  <label className="block">Edit existing article<select className={field} value="" onChange={event=>{const source=sources.find(item=>item.slug===event.target.value);if(source)write([...articles,create(source)]);}}><option value="">Choose an article</option>{sources.filter(source=>!articles.some(item=>item.slug===source.slug)).map(source=><option key={source.slug} value={source.slug}>{source.title}</option>)}</select></label>
  {articles.map((article,index)=>{
   const existing=sources.some(source=>source.slug===article.slug);
   return <details key={index} className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">{article.title} {article.enabled?'':'(hidden)'}</summary><div className="mt-4 space-y-3">
    <label className="block">Title<input className={field} value={article.title} onChange={e=>edit(index,{title:e.target.value})}/></label>
    <label className="block">URL slug<input className={field} value={article.slug} readOnly={existing} onChange={e=>edit(index,{slug:e.target.value})}/></label>
    <p className="text-xs">Keep a published slug unchanged to preserve links. Existing database article slugs are locked.</p>
    <label className="block">Display date<input type="date" className={field} value={article.date} onChange={e=>edit(index,{date:e.target.value})}/></label>
    <label className="block">Summary<textarea className={field} value={article.excerpt} onChange={e=>edit(index,{excerpt:e.target.value})}/></label>
    <label className="block">Search description<textarea className={field} value={article.meta_description} onChange={e=>edit(index,{meta_description:e.target.value})}/></label>
    {article.body===null?<div><p>Original article body is preserved.</p><button type="button" className="underline" onClick={()=>{
      const source=sources.find(item=>item.slug===article.slug);
      const template=document.createElement('template');template.innerHTML=(source?.content||'').replace(/<\/p>/gi,'</p>\n\n').replace(/<br\s*\/?>/gi,'\n');
      template.content.querySelectorAll('script,style,iframe,object').forEach(node=>node.remove());
      edit(index,{body:template.content.textContent.trim()});
    }}>Edit a plain-text copy of the original body</button></div>:<label className="block">Article body<textarea rows={10} className={field} value={article.body} onChange={e=>edit(index,{body:e.target.value})}/></label>}
    <label className="block">Cover image URL<input className={field} value={article.cover_image||''} onChange={e=>edit(index,{cover_image:e.target.value})}/></label>
    <WebsiteMediaEditor value={article.media||[]} onChange={media=>edit(index,{media,cover_image:media.find(item=>item.type==='image'&&item.enabled!==false)?.src||article.cover_image})}/>
    <label><input type="checkbox" checked={article.enabled} onChange={e=>edit(index,{enabled:e.target.checked})}/> Show article after publication</label>
   </div></details>;
  })}
  <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={()=>write([...articles,create()])}>Add article draft</button>
 </section>;
}
