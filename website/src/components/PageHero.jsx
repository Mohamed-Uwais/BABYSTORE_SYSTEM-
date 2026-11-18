import HeroImage from './HeroImage';
import { motion } from 'framer-motion';
import {useLocation} from 'react-router-dom';
import {useContent} from '../context/ContentContext';
import {PageContent} from './ManagedPage';
import {useStoreMotion} from './StoreMotion';

export default function PageHero({ backgroundImage, headline, subtitle, height = '50vh', focusPoint = 'center center' }) {
  const page=useLocation().pathname.split('/')[1];
  const managed=useContent().pages?.[page];
  const {reduced}=useStoreMotion();
  return (
    <><section className="page-hero-depth relative w-full overflow-hidden" style={{ height, minHeight: '320px' }}>
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: reduced?1:1.08 }}
        transition={{ duration: reduced?0:20, ease: 'linear' }}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <HeroImage src={backgroundImage} fetchPriority="high" className="h-full w-full object-cover" style={{ objectPosition: focusPoint }} />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a3c2a]/50 via-[#1a3c2a]/35 to-[#1a3c2a]/30" />
      <motion.div
        initial={reduced?false:{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced?0:0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
          {managed?.title||headline}
        </h1>
        {subtitle && !managed?.body && (
          <p className="mt-3 max-w-xl text-base text-white/90 drop-shadow sm:text-lg">
            {subtitle}
          </p>
        )}
      </motion.div>
    </section><PageContent page={page} showTitle={false}/></>
  );
}
