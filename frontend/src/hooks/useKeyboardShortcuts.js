import { useEffect, useCallback } from 'react';

export default function useKeyboardShortcuts(shortcuts, deps = []) {
  const handler = useCallback((e) => {
    const tag = e.target.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

    for (const s of shortcuts) {
      const keyMatch = e.key === s.key || e.code === s.code;
      if (!keyMatch) continue;
      if (s.ctrl && !e.ctrlKey && !e.metaKey) continue;
      if (!s.ctrl && (e.ctrlKey || e.metaKey) && s.key !== '?') continue;
      if (s.shift && !e.shiftKey) continue;
      if (s.alt && !e.altKey) continue;
      if (s.allowInInput === false && isInput) continue;
      if (s.allowInInput === undefined && isInput && !s.ctrl && !s.key?.startsWith('F') && s.key !== 'Escape') continue;

      e.preventDefault();
      e.stopPropagation();
      s.action(e);
      return;
    }
  }, deps);

  useEffect(() => {
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [handler]);
}
