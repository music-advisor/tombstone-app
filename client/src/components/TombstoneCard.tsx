import { Pencil, Trash2 } from 'lucide-react';
import type { Tombstone } from '../types';
import { formatDealSize } from '../types';

interface Props {
  tombstone: Tombstone;
  onEdit: (t: Tombstone) => void;
  onDelete: (id: string) => void;
}

const DEAL_TYPE_COLORS: Record<string, string> = {
  'M&A': 'bg-blue-100 text-blue-800',
  'IPO': 'bg-purple-100 text-purple-800',
  'Follow-on Offering': 'bg-indigo-100 text-indigo-800',
  'Debt Offering': 'bg-amber-100 text-amber-800',
  'Leveraged Buyout': 'bg-red-100 text-red-800',
  'Private Placement': 'bg-green-100 text-green-800',
  'Restructuring': 'bg-orange-100 text-orange-800',
  'SPAC': 'bg-pink-100 text-pink-800',
  'Other': 'bg-gray-100 text-gray-700',
};

export default function TombstoneCard({ tombstone, onEdit, onDelete }: Props) {
  const badgeClass = DEAL_TYPE_COLORS[tombstone.deal_type] ?? 'bg-gray-100 text-gray-700';

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col">
      {/* Logo area */}
      <div className="flex items-center justify-center bg-gray-50 h-40 p-4 border-b border-gray-100">
        {tombstone.logo_url ? (
          <img
            src={tombstone.logo_url}
            alt={tombstone.company_name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500 select-none">
            {tombstone.company_name[0]?.toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="font-semibold text-gray-900 text-sm leading-tight truncate" title={tombstone.company_name}>
          {tombstone.company_name}
        </p>
        {tombstone.role && (
          <p className="text-xs text-gray-500 italic truncate">{tombstone.role}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {tombstone.deal_type}
          </span>
          {tombstone.deal_size_millions !== null && (
            <span className="text-xs text-gray-600 font-medium">
              {formatDealSize(tombstone.deal_size_millions)}
            </span>
          )}
          <span className="text-xs text-gray-400 ml-auto">{tombstone.deal_year}</span>
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(tombstone)}
          className="p-1.5 bg-white rounded-lg shadow border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${tombstone.company_name}"?`)) onDelete(tombstone.id);
          }}
          className="p-1.5 bg-white rounded-lg shadow border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
