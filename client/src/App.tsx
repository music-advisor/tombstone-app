import { useState, useEffect, useCallback } from 'react';
import { Plus, ImageDown, RefreshCw } from 'lucide-react';
import type { Tombstone, Filters } from './types';
import { fetchTombstones, deleteTombstone } from './api';
import FilterBar from './components/FilterBar';
import TombstoneCard from './components/TombstoneCard';
import TombstoneForm from './components/TombstoneForm';
import ExportPanel from './components/ExportPanel';

const DEFAULT_FILTERS: Filters = {
  search: '',
  dealType: 'All',
  year: 'All',
  minSize: '',
  maxSize: '',
};

export default function App() {
  const [tombstones, setTombstones] = useState<Tombstone[]>([]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tombstone | null>(null);
  const [showExport, setShowExport] = useState(false);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTombstones(f);
      setTombstones(data);
    } catch {
      setError('Could not connect to the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const handleSave = (saved: Tombstone) => {
    setTombstones((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTombstone(id);
      setTombstones((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert('Failed to delete tombstone.');
    }
  };

  const handleEdit = (t: Tombstone) => {
    setEditing(t);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  // Derive the list of unique years for the year filter
  const allYears = Array.from(
    new Set(tombstones.map((t) => t.deal_year))
  ).sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Tombstone Manager</h1>
            <p className="text-xs text-gray-500 mt-0.5">Artisan One</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => load(filters)}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowExport(true)}
              disabled={tombstones.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ImageDown className="w-4 h-4" />
              Export PNG
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Tombstone
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        {/* Filters */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          years={allYears}
          total={tombstones.length}
        />

        {/* Grid */}
        <div className="mt-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <RefreshCw className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-gray-700 font-medium">{error}</p>
              <button
                onClick={() => load(filters)}
                className="mt-4 px-4 py-2 text-sm text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tombstones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-500 text-lg font-medium">No tombstones yet</p>
              <p className="text-gray-400 text-sm mt-1">Add your first deal to get started</p>
              <button
                onClick={handleAddNew}
                className="mt-5 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Tombstone
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {tombstones.map((t) => (
                <TombstoneCard
                  key={t.id}
                  tombstone={t}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit form modal */}
      {showForm && (
        <TombstoneForm
          initial={editing}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {/* Export full-screen panel */}
      {showExport && (
        <ExportPanel
          tombstones={tombstones}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
