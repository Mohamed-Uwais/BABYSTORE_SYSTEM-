import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';
import {MotionConfig} from 'framer-motion';

import { DEFAULTS } from '../../../shared/websiteContentDefaults.mjs';

const ContentContext = createContext(DEFAULTS);

export function ContentProvider({ children }) {
  const [content, setContent] = useState(DEFAULTS);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('preview');
    if(preview){
      const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';document.head.appendChild(robots);
      const referrer=document.createElement('meta');referrer.name='referrer';referrer.content='no-referrer';document.head.appendChild(referrer);
    }
    api.get('/content', preview ? {params:{preview}} : undefined)
      .then(r => {
        const data = r.data?.data || {};
        const merged = { ...DEFAULTS };
        for (const key of Object.keys(DEFAULTS)) {
          if (data[key]) merged[key] = { ...DEFAULTS[key], ...data[key] };
        }
        setContent(merged);
      })
      .catch(error => { if(preview)setContent({...DEFAULTS,previewError:error.response?.data?.message||'Preview could not load. Reopen it from the POS.'}); });
  }, []);

  useEffect(()=>{
    const root=document.documentElement;
    root.dataset.palette=content.appearance?.palette||'ocean';
    root.dataset.motion=content.appearance?.motion||'subtle';
    root.dataset.density=content.appearance?.density||'comfortable';
    return()=>{delete root.dataset.palette;delete root.dataset.motion;delete root.dataset.density;};
  },[content.appearance]);

  return (
    <ContentContext.Provider value={content}>
      {content.previewError && <div role="alert" className="fixed inset-0 z-[100] bg-white p-10 text-red-800">{content.previewError}</div>}
      <MotionConfig reducedMotion={content.appearance?.motion==='none'?'always':'user'}>{children}</MotionConfig>
    </ContentContext.Provider>
  );
}

export function useContent() {
  return useContext(ContentContext);
}
