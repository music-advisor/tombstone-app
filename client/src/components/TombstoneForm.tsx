import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, ImageIcon } from 'lucide-react';
import type { Tombstone } from '../types';
import { DEAL_TYPES } from '../types';
import { uploadLogo, createTombstone, updateTombstone } from '../api';

interface Props {
  initial?: Tombstone | null;
  onSave: (t: Tombstone) => void;
  onClose: () => void;
}

interface FormState {
  company_name: string;
  role: string;
  deal_type: string;
  deal_size_millions: string;
  deal_year: string;
  logo_url: string;
}

export default function TombstoneForm({ initial, onSave, onClose }: Props) {
  const isEdit = !!initial;

  const [form, setForm] = useState<FormState>({
    company_name: initial?.company_name ?? '',
    role: initial?.role ?? '',
    deal_type: initial?.deal_type ?? 'A - Sale',
    deal_size_millions: initial?.deal_size_millions != null ? String(initial.deal_size_millions) : '',
    deal_year: initial?.deal_year != null ? String(initial.deal_year) : String(new Date().getFullYear()),
    logo_url: initial?.logo_url ?? '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted[0]) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadLogo(accepted[0]);
      set('logo_url', url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) return setError('Company name is required.');
    if (!form.role.trim()) return setError('Transaction Description is required.');
    if (!form.deal_year) return setError('Deal year is required.');

    setSaving(true);
    setError('');
    try {
      const payload = {
        company_name: form.company_name.trim(),
        role: form.role.trim(),
        deal_type: form.deal_type,
        deal_size_millions: form.deal_size_millions ? parseFloat(form.deal_size_millions) : null,
        deal_year: parseInt(form.deal_year, 10),
        logo_url: form.logo_url || null,
      };

      const saved = isEdit
        ? await updateTombstone(initial!.id, payload)
        : await createTombstone(payload);

      onSave(saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Tombstone' : 'New Tombstone'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <input {...getInputProps()} />
              {form.logo_url ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={form.logo_url}
                    alt="Logo preview"
                    className="max-h-24 max-w-full object-contain"
                  />
                  <span className="text-xs text-gray-500">Click or drag to replace</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-2">
                  {uploading ? (
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        {isDragActive ? (
                          <Upload className="w-6 h-6 text-blue-500" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {isDragActive ? 'Drop logo here' : 'Drag & drop or click to upload'}
                      </p>
                      <p className="text-xs text-gray-400">PNG, JPG, SVG up to 15MB</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company / Deal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Transaction Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              placeholder="e.g. Sale of Acme Corp to Buyer Inc."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Deal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.deal_type}
              onChange={(e) => set('deal_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {DEAL_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Deal Size + Year */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Size ($M)</label>
              <input
                type="number"
                value={form.deal_size_millions}
                onChange={(e) => set('deal_size_millions', e.target.value)}
                placeholder="e.g. 500"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Enter in millions (e.g. 1500 = $1.5B)</p>
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.deal_year}
                onChange={(e) => set('deal_year', e.target.value)}
                placeholder="2024"
                min="1990"
                max="2100"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Tombstone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
