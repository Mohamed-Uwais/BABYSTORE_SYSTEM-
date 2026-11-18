import {useContent} from '../context/ContentContext';
import {useParams} from 'react-router-dom';
import ManagedMedia from './ManagedMedia';
import SEO from './SEO';
import {PAGE_NAMES} from '../../../shared/websiteOptions.mjs';
export function PageContent({page,showTitle=true}){
  const content=useContent().pages?.[page];
  if(!content)return null;
  return <section className="managed-page mx-auto max-w-5xl space-y-6 px-4 py-10">
    {showTitle&&content.title&&<h2 className="text-3xl font-bold text-slate-900">{content.title}</h2>}
    {(content.body||'').split(/\n\s*\n/).filter(Boolean).map((paragraph,index)=><p key={index} className="whitespace-pre-line leading-8 text-slate-700">{paragraph}</p>)}
    <ManagedMedia items={content.media||[]}/>
    {(content.faqs||[]).map((item,index)=><details key={index} className="rounded-xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-semibold">{item.question}</summary><p className="mt-3 whitespace-pre-line text-slate-700">{item.answer}</p></details>)}
  </section>;
}
export default function ManagedPage({page:given}){
  const {slug}=useParams();const page=given||slug;
  const managed=useContent().pages?.[page];
  const allowed=['faq','privacy','returns','shipping','terms'];
  if(!allowed.includes(page))return <div className="p-10">Page not found</div>;
  return <div><SEO title={PAGE_NAMES[page]} path={page==='faq'?'/faq':`/policies/${page}`}/><h1 className="mx-auto max-w-5xl px-4 pt-10 text-4xl font-bold">{managed?.title||PAGE_NAMES[page]}</h1><PageContent page={page} showTitle={false}/></div>;
}
