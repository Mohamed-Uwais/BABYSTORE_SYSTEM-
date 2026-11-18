import {MOTION_OPTIONS} from '../../../shared/motionPolicy.mjs';
import {useState} from 'react';
import WebsiteMediaEditor from './WebsiteMediaEditor';
import WebsiteArticlesEditor from './WebsiteArticlesEditor';
import {HOME_SECTIONS,PAGE_KEYS,PAGE_NAMES,MENU_DESTINATIONS} from '../../../shared/websiteOptions.mjs';
export default function WebsiteSettingsEditor({content,setContent}){
  const [page,setPage]=useState('about');
  const set=(key,value)=>setContent(old=>({...old,[key]:value}));
  const current=content.pages?.[page]||{title:'',body:'',media:[],faqs:[]};
  const editPage=patch=>set('pages',{...content.pages,[page]:{...current,...patch}});
  const sections=content.homepage?.sections||HOME_SECTIONS.map(key=>({key,enabled:true}));
  const menus=content.navigation?.items||[];
  const field='w-full rounded border border-slate-300 bg-white p-2 text-slate-900';
  return <div className="space-y-6 rounded-xl border bg-white p-5 text-slate-900">
    <h2 className="text-xl font-semibold">Pages and media</h2>
    <label>Page<select className={field} value={page} onChange={e=>setPage(e.target.value)}>{PAGE_KEYS.map(key=><option key={key} value={key}>{PAGE_NAMES[key]}</option>)}</select></label>
    <label className="block">Page heading<input className={field} value={current.title||''} onChange={e=>editPage({title:e.target.value})}/></label>
    <label className="block">Page text (blank lines separate paragraphs)<textarea rows={7} className={field} value={current.body||''} onChange={e=>editPage({body:e.target.value})}/></label>
    <label className="block">Search description<textarea className={field} value={current.meta_description||''} onChange={e=>editPage({meta_description:e.target.value})}/></label>
    <WebsiteMediaEditor value={current.media||[]} onChange={media=>editPage({media})}/>
    {(current.faqs||[]).map((item,i)=><div key={i} className="space-y-2 rounded border p-3"><label>Question<input className={field} value={item.question} onChange={e=>editPage({faqs:current.faqs.map((x,j)=>j===i?{...x,question:e.target.value}:x)})}/></label><label>Answer<textarea className={field} value={item.answer} onChange={e=>editPage({faqs:current.faqs.map((x,j)=>j===i?{...x,answer:e.target.value}:x)})}/></label><button type="button" onClick={()=>editPage({faqs:current.faqs.filter((_,j)=>j!==i)})}>Remove question</button></div>)}
    <button type="button" onClick={()=>editPage({faqs:[...(current.faqs||[]),{question:'',answer:''}]})}>Add FAQ</button>
    <WebsiteArticlesEditor content={content} setContent={setContent}/>
    <h2 className="text-xl font-semibold">Homepage sections</h2>
    {sections.map((item,i)=><div key={item.key} className="flex gap-4"><label className="flex-1"><input type="checkbox" checked={item.enabled!==false} onChange={e=>set('homepage',{...content.homepage,sections:sections.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x)})}/> {item.key.replaceAll('_',' ')}</label><button type="button" disabled={!i} onClick={()=>{const next=[...sections];[next[i-1],next[i]]=[next[i],next[i-1]];set('homepage',{...content.homepage,sections:next});}}>Move up</button></div>)}
    {sections.map(item=><div key={`copy-${item.key}`} className="space-y-2 rounded border p-3"><label className="block">{item.key.replaceAll('_',' ')} navigation label<input className={field} value={item.label||''} onChange={e=>set('homepage',{...content.homepage,sections:sections.map(x=>x.key===item.key?{...x,label:e.target.value}:x)})}/></label>{['categories','featured','new_arrivals','blog','testimonials'].includes(item.key)&&(item.key==='categories'?['title']:['title','subtitle']).map(fieldName=><label className="block" key={fieldName}>{fieldName}<input className={field} value={item[fieldName]||''} onChange={e=>set('homepage',{...content.homepage,sections:sections.map(x=>x.key===item.key?{...x,[fieldName]:e.target.value}:x)})}/></label>)}</div>)}
    <label className="block">Featured product slugs (one per line; leave blank for current catalogue selection)<textarea className={field} value={(content.homepage?.featured_slugs||[]).join('\n')} onChange={e=>set('homepage',{...content.homepage,featured_slugs:e.target.value.split('\n').filter(Boolean)})}/></label>
    <h3 className="font-semibold">Hero media</h3><WebsiteMediaEditor value={content.hero?.media||[]} onChange={media=>set('hero',{...content.hero,media})}/>
    <h2 className="text-xl font-semibold">Navigation</h2>
    {menus.map((item,i)=><div key={i} className="flex flex-wrap gap-2"><label>Label<input className={field} value={item.label} onChange={e=>set('navigation',{items:menus.map((x,j)=>j===i?{...x,label:e.target.value}:x)})}/></label><label>Destination<select className={field} value={item.to} onChange={e=>set('navigation',{items:menus.map((x,j)=>j===i?{...x,to:e.target.value}:x)})}>{MENU_DESTINATIONS.map(to=><option key={to}>{to}</option>)}</select></label><button type="button" disabled={!i} onClick={()=>{const next=[...menus];[next[i-1],next[i]]=[next[i],next[i-1]];set('navigation',{items:next});}}>Move up</button><button type="button" onClick={()=>set('navigation',{items:menus.filter((_,j)=>j!==i)})}>Remove</button></div>)}
    <button type="button" onClick={()=>set('navigation',{items:[...menus,{label:'New link',to:'/shop'}]})}>Add navigation link</button>
    <h2 className="text-xl font-semibold">Appearance presets</h2>
    {[['palette',['ocean','botanical','rose']],['motion',MOTION_OPTIONS.map(option=>option.value)],['density',['comfortable','compact']]].map(([key,options])=><label className="block" key={key}>{key}<select className={field} value={content.appearance?.[key]||options[0]} onChange={e=>set('appearance',{...content.appearance,[key]:e.target.value})}>{options.map(option=><option key={option} value={option}>{key==='motion'?MOTION_OPTIONS.find(item=>item.value===option)?.label:option}</option>)}</select></label>)}
    <p className="text-sm">Save all drafts, then preview before publishing. These controls manage supported layouts; new page types and integrations require development.</p>
  </div>;
}
