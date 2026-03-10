import { Search, X } from 'lucide-react';
import type { Filters } from '../types';
import { DEAL_TYPES } from '../types';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  years: number[];
  total: number;
}

export default function FilterBar({ filters, onChange, years, total }: Props) {
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value });

  const hasActiveFilters =
    filters.search || filters.dealType !== 'All' || filters.year !== 'All' || filters.minSize || filters.maxSize;

  const reset = () =>
    onChange({ search: '', dealType: 'All', year: 'All', minSize: '', maxSize: '' });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Company name…"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Deal Type */}
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Deal Type</label>
          <select
            value={filters.dealType}
            onChange={(e) => set('dealType', e.target.value)}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="All">All Types</option>
            {DEAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="min-w-[120px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
          <select
            value={filters.year}
            onChange={(e) => set('year', e.target.value)}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="All">All Years</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        {/* Size Range */}
        <div className="min-w-[120px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Min Size ($M)</label>
          <input
            type="number"
            placeholder="0"
            value={filters.minSize}
            onChange={(e) => set('minSize', e.target.value)}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="min-w-[120px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Max Size ($M)</label>
          <input
            type="number"
            placeholder="∞"
            value={filters.maxSize}
            onChange={(e) => set('maxSize', e.target.value)}
            className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Clear + count */}
        <div className="flex items-end gap-2 ml-auto">
          {hasActiveFilters && (
            <button
              onClick={reset}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
          <span className="text-sm text-gray-500 py-2 whitespace-nowrap">
            {total} deal{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
