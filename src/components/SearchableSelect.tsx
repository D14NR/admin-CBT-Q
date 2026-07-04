import React, { useEffect, useRef, useState } from 'react';

export type Option = {
  value: string;
  label: string;
  subLabel?: string;
};

type Props = {
  options: Option[];
  value?: string | string[] | null;
  onChange: (v: string | string[]) => void;
  placeholder?: string;
  allowClear?: boolean;
  multi?: boolean;
  disabled?: boolean;
};

export function SearchableSelect({ options, value, onChange, placeholder = 'Pilih...', allowClear = true, multi = false, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const filtered = options.filter(o => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return o.label.toLowerCase().includes(q) || (o.subLabel || '').toLowerCase().includes(q);
  });

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selected = options.find(o => o.value === (Array.isArray(value) ? value[0] : value));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { if (disabled) return; setOpen(v => !v); }}
        disabled={disabled}
        className={`w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-left text-sm text-gray-700 focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="truncate">
          {Array.isArray(value) ? (
            value && (value as string[]).length > 0 ? (
              <div className="font-medium text-gray-800">{(value as string[]).length} dipilih</div>
            ) : (
              <div className="text-gray-400">{placeholder}</div>
            )
          ) : (
            selected ? (
              <div className="font-medium text-gray-800">{selected.label}</div>
            ) : (
              <div className="text-gray-400">{placeholder}</div>
            )
          )}
        </div>
        <svg className="ml-3 h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="p-2">
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none"
              placeholder="Cari..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-56 overflow-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">Tidak ada hasil</li>
            )}
            {filtered.map(opt => (
              <li
                key={opt.value}
                onClick={() => {
                  if (multi) {
                    const cur = selectedValues || [];
                    const exists = cur.includes(opt.value);
                    const next = exists ? cur.filter(v => v !== opt.value) : [...cur, opt.value];
                    onChange(next);
                  } else {
                    onChange(opt.value);
                    setOpen(false);
                  }
                  setQuery('');
                }}
                className="cursor-pointer px-3 py-2 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800">{opt.label}</div>
                    {opt.subLabel && <div className="text-xs text-gray-500">{opt.subLabel}</div>}
                  </div>
                  {multi ? (
                    <input type="checkbox" readOnly checked={selectedValues.includes(opt.value)} className="mt-1" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
