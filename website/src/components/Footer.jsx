import {Link} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import SocialIcon from './SocialIcon';
export default function Footer(){
 const {footer,navigation,pages}=useContent();
 return <footer className="relative mt-auto bg-slate-900 text-slate-200">
  <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
   <div><Link to="/" className="flex items-center gap-3 text-xl font-bold text-white"><img src="/favicon.png" width="48" height="48" alt="" className="rounded-full"/>LITTORA</Link><p className="mt-5 text-sm leading-7">{footer.description||'Baby care, toys, flowers and home décor for your family.'}</p></div>
   <nav aria-label="Footer navigation"><h2 className="mb-4 font-semibold text-white">Explore</h2><ul className="space-y-3">{(navigation?.items||[]).map((link,index)=><li key={index}><Link to={link.to} className="hover:text-primary-200">{link.label}</Link></li>)}</ul></nav>
   <div><h2 className="mb-4 font-semibold text-white">Contact</h2><div className="space-y-3 text-sm">{footer.address&&<p>{footer.address}</p>}{footer.phone&&<a className="block" href={`tel:${footer.phone.replace(/\s/g,'')}`}>{footer.phone}</a>}{footer.email&&<a className="block break-words" href={`mailto:${footer.email}`}>{footer.email}</a>}{footer.whatsapp&&<a className="block" href={`https://wa.me/${footer.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}</div></div>
   <div><h2 className="mb-4 font-semibold text-white">Stay connected</h2><div className="flex gap-3">{['instagram','youtube','tiktok','facebook'].filter(name=>footer[name]).map(name=><a key={name} href={footer[name]} target="_blank" rel="noopener noreferrer" aria-label={name} className="rounded-xl bg-slate-800 p-3 text-white hover:bg-slate-700"><SocialIcon name={name}/></a>)}</div><nav aria-label="Help and policies" className="mt-5 flex flex-wrap gap-3 text-sm">{['faq','shipping','returns','privacy','terms'].filter(key=>pages?.[key]?.body||pages?.[key]?.faqs?.length).map(key=><Link className="capitalize" key={key} to={key==='faq'?'/faq':`/policies/${key}`}>{key}</Link>)}</nav></div>
  </div><p className="border-t border-slate-700 py-5 text-center text-sm">&copy; {new Date().getFullYear()} LITTORA. All rights reserved.</p>
 </footer>;
}
