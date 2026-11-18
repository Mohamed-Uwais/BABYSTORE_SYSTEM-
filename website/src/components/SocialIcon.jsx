export default function SocialIcon({name}) {
  const common={viewBox:'0 0 24 24',className:'h-6 w-6','aria-hidden':true};
  if(name==='instagram')return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>;
  if(name==='facebook')return <svg {...common} fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>;
  if(name==='youtube')return <svg {...common} fill="currentColor"><rect x="1" y="4" width="22" height="16" rx="5"/><path d="m10 8 6 4-6 4z" fill="white"/></svg>;
  return <svg {...common} fill="currentColor"><path d="M14 2h4c0 3 2 5 5 5v4c-2 0-4-1-5-2v8a7 7 0 1 1-7-7v4a3 3 0 1 0 3 3z"/></svg>;
}
