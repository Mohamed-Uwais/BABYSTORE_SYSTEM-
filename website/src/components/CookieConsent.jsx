import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('littora_cookies_accepted')) {
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem('littora_cookies_accepted', '1');
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white p-4 shadow-lg sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-sm sm:rounded-2xl sm:border"
        >
          <p className="mb-3 text-sm text-slate-600">
            We use cookies to improve your experience. By continuing, you agree to our use of cookies.
          </p>
          <button
            onClick={accept}
            className="rounded-xl bg-primary-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 active:scale-[0.97]"
          >
            Accept
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
