import type { FilterHook } from '../hooks/useMultiFilter';

export default function MultiDropdown<T extends string>({ hook, items, singular, plural, badgeType }: {
  hook: FilterHook<T>;
  items: T[];
  singular: string;
  plural?: string;
  badgeType: 'priority' | 'severity' | 'status' | 'type';
}) {
  return (
    <div className="priority-dropdown" ref={hook.ref}>
      <button
        className={`priority-dropdown-trigger${hook.open ? ' open' : ''}${hook.selected.size > 0 ? ' has-selection' : ''}`}
        onClick={() => hook.setOpen((o) => !o)}
      >
        <span>{hook.label(singular, plural)}</span>
        {hook.selected.size > 0
          ? <span className="dropdown-clear" onClick={(e) => { e.stopPropagation(); hook.clear(); }}>×</span>
          : <span className="dropdown-chevron">▾</span>
        }
      </button>
      {hook.open && (
        <div className="priority-dropdown-menu">
          {items.map((v) => (
            <div
              key={v}
              className={`priority-dropdown-item${hook.selected.has(v) ? ' active' : ''}`}
              onClick={() => hook.toggle(v)}
            >
              <span className={`badge badge-${badgeType}-${v.replace('_', '-')}`}>
                <span>{v.replace('_', ' ')}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
