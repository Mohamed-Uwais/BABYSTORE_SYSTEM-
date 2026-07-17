import { motion } from 'framer-motion';

export default function PageHero({ backgroundImage, headline, subtitle, height = '50vh', focusPoint = 'center center' }) {
  return (
    <section className="relative w-full overflow-hidden" style={{ height, minHeight: '320px' }}>
      <motion.img
        src={backgroundImage}
        alt=""
        initial={{ scale: 1 }}
        animate={{ scale: 1.08 }}
        transition={{ duration: 20, ease: 'linear' }}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: focusPoint }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a3c2a]/50 via-[#1a3c2a]/35 to-[#1a3c2a]/30" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl lg:text-5xl">
          {headline}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-xl text-base text-white/90 drop-shadow sm:text-lg">
            {subtitle}
          </p>
        )}
      </motion.div>
    </section>
  );
}
