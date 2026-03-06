import { useState, useEffect, useRef } from 'react';

export function useMultiFilter<T extends string>() {
  const [selected, setSelected] = useState<Set<T>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function toggle(v: T) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  function clear() { setSelected(new Set()); }

  function label(singular: string, plural?: string) {
    const p = plural ?? `${singular}s`;
    if (selected.size === 0) return `All ${p}`;
    if (selected.size === 1) return [...selected][0];
    return `${selected.size} ${p}`;
  }

  return { selected, open, setOpen, ref, toggle, clear, label };
}

export type FilterHook<T extends string> = ReturnType<typeof useMultiFilter<T>>;
