import {Children,useEffect,useRef,useState} from 'react';
import {useContent} from '../context/ContentContext';
import {HOME_SECTIONS} from '../../../shared/websiteOptions.mjs';
import {useLocation} from 'react-router-dom';
import {Reveal,useStoreMotion} from './StoreMotion';
export default function HomeSections({children}){
  const content=useContent();const [active,setActive]=useState('hero');
  const location=useLocation();
  const {reduced}=useStoreMotion();
  // Children.map preserves null section positions so unavailable product/blog
  // sections never acquire another section's identity.
  const slots=[];Children.forEach(children,child=>slots.push(child));
  const order=content.homepage?.sections||HOME_SECTIONS.map(key=>({key,enabled:true}));
  const visible=order.filter(item=>item.enabled!==false&&slots[HOME_SECTIONS.indexOf(item.key)]);
  const sectionKeys=visible.map(item=>item.key).join(',');
  const scrolledHash=useRef('');
  useEffect(()=>{window.dispatchEvent(new CustomEvent('littora-section',{detail:active}));},[active]);
  useEffect(()=>{
    const sections=[...document.querySelectorAll('[data-home-section]')];
    let frame=0;
    const measure=()=>{
      frame=0;
      let current=sections[0];
      // Read positions together before updating state; no scroll interception.
      for(const section of sections){if(section.getBoundingClientRect().top<=160)current=section;}
      if(current)setActive(current.id);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(measure);};
    schedule();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
  },[sectionKeys]);
  useEffect(()=>{
    if(!location.hash){scrolledHash.current='';return;}
    if(scrolledHash.current===location.hash)return;
    const target=document.getElementById(location.hash.slice(1));
    if(target){target.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});scrolledHash.current=location.hash;}
  },[location.hash,sectionKeys,reduced]);
  return <><nav aria-label="Homepage sections" className="sticky top-16 z-30 flex gap-3 overflow-x-auto border-y border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
    {visible.map(item=><a key={item.key} href={`#${item.key}`} aria-current={active===item.key?'location':undefined} className={`shrink-0 rounded-full px-4 py-2 text-sm ${active===item.key?'bg-primary-700 text-white':'text-slate-700'}`}>{item.label||item.key.replaceAll('_',' ')}</a>)}
  </nav>{visible.map(item=><div key={item.key} id={item.key} data-home-section className="scroll-mt-36">{['hero','story'].includes(item.key)?slots[HOME_SECTIONS.indexOf(item.key)]:<Reveal>{slots[HOME_SECTIONS.indexOf(item.key)]}</Reveal>}</div>)}</>;
}
