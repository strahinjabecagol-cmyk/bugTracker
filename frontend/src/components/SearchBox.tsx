import { useEffect, useRef, useState } from 'react';
import Badge from './Badge';
import type { Bug } from '../types';

export interface SearchBoxItem {
  id: number;
  title: string;
  status: Bug['status'];
  type: Bug['type'];
  priority: Bug['priority'];
}

interface SearchBoxProps {
  items: SearchBoxItem[];
  onSelect: (item: SearchBoxItem) => void;
  placeholder?: string;
  label?: string;
  exclude?: number[];
}

export default function SearchBox({
  items,
  onSelect,
  placeholder = 'Search by ID or title…',
  label,
  exclude = [],
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim() === ''
    ? []
    : items
        .filter((item) => {
          if (exclude.includes(item.id)) return false;
          const q = query.trim().toLowerCase();
          return String(item.id).includes(q) || item.title.toLowerCase().includes(q);
        })
        .slice(0, 8);

  useEffect(() => { setHighlighted(0); }, [query]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); select(filtered[highlighted]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  }

  function select(item: SearchBoxItem) {
    onSelect(item);
    setQuery('');
    setOpen(false);
  }

  function clear() {
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="searchbox" ref={ref}>
      {label && <label className="searchbox-label">{label}</label>}
      <div className="searchbox-control">
        <span className="searchbox-icon" aria-hidden>⌕</span>
        <input
          ref={inputRef}
          type="text"
          className="searchbox-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={handleKey}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button type="button" className="searchbox-clear" onClick={clear} tabIndex={-1}>×</button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="searchbox-dropdown" role="listbox">
          {filtered.map((item, i) => (
            <div
              key={item.id}
              role="option"
              aria-selected={i === highlighted}
              className={`searchbox-item${i === highlighted ? ' highlighted' : ''}`}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => { e.preventDefault(); select(item); }}
            >
              <span className="searchbox-item-id">#{item.id}</span>
              <span className="searchbox-item-title">{item.title}</span>
              <span className="searchbox-item-badges">
                <Badge value={item.status} type="status" />
                <Badge value={item.type} type="type" />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
