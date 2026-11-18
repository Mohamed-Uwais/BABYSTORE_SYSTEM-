import {useEffect,useRef} from 'react';
export default function useDialogFocus(open,onClose){
 const ref=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const panel=ref.current;
  const focusable=()=>[...(panel?.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')||[])].filter(node=>node.getClientRects().length);
  (focusable()[0]||panel)?.focus();
  const keydown=event=>{
   if(event.key==='Escape'){event.preventDefault();close.current();}
   if(event.key!=='Tab')return;
   const nodes=focusable(),first=nodes[0],last=nodes.at(-1);
   if(!first){event.preventDefault();panel?.focus();return;}
   if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',keydown);
  return()=>{document.removeEventListener('keydown',keydown);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[open]);
 return ref;
}
