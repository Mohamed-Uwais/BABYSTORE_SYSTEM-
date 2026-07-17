import { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
  const isDecimal = String(value).includes('.') || numericValue % 1 !== 0;

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(numericValue);
      return;
    }

    let start = null;
    const from = 0;
    const to = numericValue;

    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [numericValue, duration]);

  const formatted = isDecimal
    ? display.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(display).toLocaleString('en-LK');

  return <>{prefix}{formatted}{suffix}</>;
}
