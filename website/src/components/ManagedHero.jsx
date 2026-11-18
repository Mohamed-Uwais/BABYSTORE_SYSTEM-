import {Link} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import ManagedMedia from './ManagedMedia';
import HeroImage from './HeroImage';
import {Reveal,useStoreMotion} from './StoreMotion';
import DepthSurface from './DepthSurface';
import {Baby,Flower2,Blocks} from 'lucide-react';
export default function ManagedHero(){
  const {hero}=useContent();
  const {enhanced}=useStoreMotion();
  return <section className={`hero-depth-scene relative overflow-hidden bg-gradient-to-br from-primary-100 via-teal-50 to-rose-100 px-4 py-14 lg:py-24 ${enhanced?'is-enhanced':''}`}>
    {enhanced&&<div className="hero-light-field" aria-hidden="true"><span/><span/><span/></div>}
    <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2"><Reveal hero className="hero-copy-layer">
      {hero.badge&&<p className="mb-5 font-semibold tracking-widest text-primary-800">{hero.badge}</p>}
      <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">{hero.headline_1}<span className="mt-3 block text-primary-700">{hero.headline_2}</span></h1>
      <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">{hero.subtitle}</p>
      <Link to="/shop" className="mt-8 inline-flex rounded-full bg-primary-700 px-8 py-4 font-semibold text-white shadow-lg transition hover:-translate-y-1">{hero.cta_text||'Shop now'}</Link>
      {hero.delivery_msg&&<p className="mt-5 text-sm text-slate-700">{hero.delivery_msg}</p>}
    </Reveal><Reveal hero delay={0.12} className="hero-media-stage">
      <DepthSurface className="hero-media-depth" strength={3}>
        {enhanced&&<><div className="hero-backplate plate-one" aria-hidden="true"/><div className="hero-backplate plate-two" aria-hidden="true"/></>}
        <div className="hero-photo-layer overflow-hidden rounded-[2rem] shadow-xl">{hero.media?.some(item=>item.enabled!==false)?<ManagedMedia items={hero.media} priority/>:<HeroImage src="/images/hero/slide-1.jpg" alt="LITTORA baby care collection" fetchPriority="high" sizes="(min-width: 1280px) 620px, (min-width: 1024px) calc((100vw - 72px) / 2), calc(100vw - 32px)" className="aspect-[4/3] w-full object-cover"/>}</div>
        {enhanced&&<div className="hero-brand-layers" aria-hidden="true">
          <span className="brand-seal"><img src="/favicon.png" width="48" height="48" alt=""/>LITTORA</span>
          <span className="brand-token token-care"><Baby/></span><span className="brand-token token-play"><Blocks/></span><span className="brand-token token-flower"><Flower2/></span>
        </div>}
      </DepthSurface>
    </Reveal></div>
  </section>;
}
