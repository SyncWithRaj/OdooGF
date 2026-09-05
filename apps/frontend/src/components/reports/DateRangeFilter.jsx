'use client';

import { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';

const PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

export default function DateRangeFilter({ onFilterChange, currentFilter = {} }) {
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState(currentFilter.startDate || '');
  const [endDate, setEndDate] = useState(currentFilter.endDate || '');

  const handlePresetSelect = (id) => {
    setPreset(id);
    const now = new Date();
    let start = '';
    let end = '';

    if (id === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else if (id === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else if (id === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      start = d.toISOString().slice(0, 10);
      end = now.toISOString().slice(0, 10);
    } else if (id === 'year') {
      start = `${now.getFullYear()}-01-01`;
      end = now.toISOString().slice(0, 10);
    } else if (id === 'all') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);
    onFilterChange({ startDate: start, endDate: end, preset: id });
  };

  const handleCustomApply = (e) => {
    e.preventDefault();
    onFilterChange({ startDate, endDate, preset: 'custom' });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-slate-400 flex items-center gap-1 font-medium mr-1">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          Date Range:
        </span>
        {PRESETS.map((p) => {
          const active = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                active
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {preset === 'custom' && (
        <form onSubmit={handleCustomApply} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
