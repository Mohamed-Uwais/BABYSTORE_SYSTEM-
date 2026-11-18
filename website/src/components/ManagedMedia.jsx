import {useEffect,useRef,useState} from 'react';
import {useReducedMotion} from 'framer-motion';
import {useContent} from '../context/ContentContext';
export default function ManagedMedia({items=[],priority=false}){
  return <div className="managed-media space-y-4">{items.filter(item=>item.enabled!==false).map((item,index)=>item.type==='video'?<Video key={`${index}:${item.src}`} item={item}/>:<img key={`${index}:${item.src}`} src={item.src} srcSet={item.srcSet?.map(entry=>`${entry.src} ${entry.width}w`).join(', ')||undefined} sizes="(min-width: 1024px) 960px, calc(100vw - 32px)" alt={item.alt||''} width={item.width||1280} height={item.height||720} className="max-h-[70vh] w-full rounded-2xl object-contain" loading={priority&&index===0?'eager':'lazy'} fetchPriority={priority&&index===0?'high':'auto'} decoding="async"/>)}</div>;
}
function Video({item}){
  const ref=useRef(null),systemReduced=useReducedMotion();
  const {appearance}=useContent();
  const reduced=systemReduced||appearance?.motion==='none';
  const [started,setStarted]=useState(false),[playing,setPlaying]=useState(false);
  useEffect(()=>{
    const element=ref.current;if(!element||typeof IntersectionObserver==='undefined')return;
    const observer=new IntersectionObserver(([entry])=>{
      if(!entry.isIntersecting){element.pause();return;}
      if(item.autoplay&&!reduced&&!navigator.connection?.saveData){
        setStarted(true);
        if(!element.getAttribute('src'))element.src=item.src;
        element.play().catch(()=>{});
      }
    },{threshold:0.3});observer.observe(element);return()=>observer.disconnect();
  },[item.autoplay,item.src,reduced]);
  useEffect(()=>{if(reduced)ref.current?.pause();},[reduced]);
  return <figure className="relative overflow-hidden rounded-2xl bg-slate-900">
    <video ref={ref} src={started?item.src:undefined} poster={item.poster||undefined} preload="none" muted={!!item.autoplay} loop={!!item.loop} controls={started} playsInline className="aspect-video w-full" aria-label={item.alt||'Product or page video'} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>
    <button type="button" className="absolute left-3 top-3 rounded-lg bg-white px-4 py-2 font-semibold text-slate-900" onClick={()=>{
      const element=ref.current;
      if(playing)element.pause();else {setStarted(true);if(!element.src)element.src=item.src;element.play().catch(()=>{});}
    }}>{playing?'Pause video':'Play video'}</button>
    {item.alt&&<figcaption className="px-4 py-2 text-sm text-white">{item.alt}</figcaption>}
  </figure>;
}
