import { useEffect, useRef, useState } from 'react';
import Badge from './Badge';

export default function SidebarDropdown<T extends string>({ label, value, options, onChange, badgeType, className }: {
  label: string;
  value: T | null | undefined;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  badgeType?: 'status' | 'priority' | 'severity' | 'type';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className={`form-group${className ? ` ${className}` : ''}`}>
      <label>{label}</label>
      <div className="priority-dropdown" ref={ref}>
        <button
          type="button"
          className={`priority-dropdown-trigger${current ? ' has-selection' : ''}${open ? ' open' : ''}`}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{current?.label ?? '—'}</span>
          <span className="dropdown-chevron">▾</span>
        </button>
        {open && (
          <div className="priority-dropdown-menu">
            {options.map((o) => (
              <div
                key={o.value}
                className={`priority-dropdown-item${value === o.value ? ' active' : ''}${!badgeType ? ' plain' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {badgeType
                  ? <Badge value={o.value} type={badgeType} />
                  : <span><span>{o.label}</span></span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
