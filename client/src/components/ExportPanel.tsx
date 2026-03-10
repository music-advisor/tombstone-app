import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { X, Download, Loader2, Check, Search, ZoomIn, ZoomOut, GripVertical } from 'lucide-react';
import html2canvas from 'html2canvas';
import type { Tombstone } from '../types';
import { DEAL_TYPES } from '../types';

interface Props {
  tombstones: Tombstone[];
  onClose: () => void;
}

const AVENIR = '"Avenir Book", "Avenir", "Century Gothic", "Trebuchet MS", Arial, sans-serif';

interface CardSettings {
  fontSize: number;
  fontColor: string;
  logoScale: number;
}

// ── Export card ─────────────────────────────────────────────────────────────
function ExportCard({ tombstone, settings }: { tombstone: Tombstone; settings: CardSettings }) {
  return (
    <div
      style={{
        border: '1.5px solid #000000',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px 8px 4px',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {tombstone.logo_url ? (
          <img
            src={tombstone.logo_url}
            alt={tombstone.company_name}
            crossOrigin="anonymous"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', transform: `scale(${settings.logoScale})`, transformOrigin: 'center center' }}
          />
        ) : (
          <div
            style={{
              width: 52, height: 52, borderRadius: '50%', background: '#e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#6b7280', fontFamily: 'Inter, Arial, sans-serif',
            }}
          >
            {tombstone.company_name[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ padding: '0 6px 10px', background: '#ffffff', flexShrink: 0 }}>
        <p style={{ margin: '0 0 1px', fontSize: settings.fontSize, fontWeight: 700, color: settings.fontColor, fontFamily: AVENIR, lineHeight: 1.45, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', textAlign: 'center' }}>
          {tombstone.role || '—'}
        </p>
        <p style={{ margin: 0, fontSize: settings.fontSize, fontWeight: 700, color: settings.fontColor, fontFamily: AVENIR, lineHeight: 1.3, textAlign: 'center' }}>
          {tombstone.deal_year}
        </p>
      </div>
    </div>
  );
}

// ── Empty placeholder cell ──────────────────────────────────────────────────
function EmptyCell() {
  return <div style={{ border: '1.5px dashed #d1d5db', background: '#f9fafb', boxSizing: 'border-box' }} />;
}

// ── PNG DPI embedding ────────────────────────────────────────────────────────
function makeCrcTable(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
}
const CRC_TABLE = makeCrcTable();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function embedDpi(png: Uint8Array, dpi: number): Uint8Array {
  const ppm = Math.round(dpi / 0.0254);
  const type = new Uint8Array([112, 72, 89, 115]);
  const data = new Uint8Array(9);
  new DataView(data.buffer).setUint32(0, ppm, false);
  new DataView(data.buffer).setUint32(4, ppm, false);
  data[8] = 1;
  const typeAndData = new Uint8Array(13);
  typeAndData.set(type, 0);
  typeAndData.set(data, 4);
  const crc = crc32(typeAndData);
  const chunk = new Uint8Array(21);
  new DataView(chunk.buffer).setUint32(0, 9, false);
  chunk.set(type, 4);
  chunk.set(data, 8);
  new DataView(chunk.buffer).setUint32(17, crc, false);
  const insertAt = 33;
  const out = new Uint8Array(png.length + 21);
  out.set(png.slice(0, insertAt), 0);
  out.set(chunk, insertAt);
  out.set(png.slice(insertAt), insertAt + 21);
  return out;
}

// ── Grid size presets ───────────────────────────────────────────────────────
const PRESETS = ['2×2','2×3','3×2','3×3','3×4','4×3','4×4','5×3','5×4','6×4','7×4','8×4','8×5','9×4','9×5'] as const;

function parsePreset(p: string): [number, number] {
  const [c, r] = p.split('×').map(Number);
  return [c, r];
}

// Card size: 118px CSS × 3 scale = 354 px ÷ 288 DPI ≈ 1.23" in PowerPoint (+0.01" vs before)
// Gap: 9px CSS × 3 = 27 px ÷ 288 DPI ≈ 0.094" (+0.05" vs before)
const CARD_W = 118;
const CARD_H = 118;
const GAP = 9;

// ── Main component ──────────────────────────────────────────────────────────
export default function ExportPanel({ tombstones, onClose }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  // Grid configuration
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(4);

  // Text settings
  const [fontSize, setFontSize] = useState(9);
  const [fontColor, setFontColor] = useState('#000000');

  // Preview zoom
  const [zoom, setZoom] = useState(1);

  // Per-tombstone logo scale
  const [logoScales, setLogoScales] = useState<Record<string, number>>({});
  const getLogoScale = (id: string) => logoScales[id] ?? 1;
  const setLogoScale = (id: string, val: number) =>
    setLogoScales((prev) => ({ ...prev, [id]: val }));

  // Hover state for floating logo-size slider
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHide = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleRowMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, id: string) => {
    cancelHide();
    const rect = e.currentTarget.getBoundingClientRect();
    setSliderPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
    setHoveredId(id);
  }, []);

  const handleRowMouseLeave = useCallback(() => {
    hideTimerRef.current = setTimeout(() => setHoveredId(null), 120);
  }, []);

  // ── Multi-page state ──────────────────────────────────────────────────────
  const [pages, setPages] = useState<string[][]>([[]]);
  const [activePage, setActivePage] = useState(0);

  const selectedIds: string[] = pages[activePage] ?? [];

  const setSelectedIds = useCallback((updater: string[] | ((prev: string[]) => string[])) => {
    setPages((prev) => {
      const next = [...prev];
      const current = prev[activePage] ?? [];
      next[activePage] = typeof updater === 'function' ? updater(current) : updater;
      return next;
    });
  }, [activePage]);

  const addPage = () => {
    const newIdx = pages.length;
    setPages((prev) => [...prev, []]);
    setActivePage(newIdx);
  };

  const removePage = (idx: number) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== idx));
    setActivePage((prev) => Math.min(prev, pages.length - 2));
  };

  // ── Drag-to-reorder state ─────────────────────────────────────────────────
  const [dragSrcId, setDragSrcId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<'before' | 'after'>('before');

  const clearDragOver = () => { setDragOverId(null); };

  // Filter state
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('All');

  const capacity = cols * rows;

  const filteredForSelection = useMemo(() => {
    return tombstones.filter((t) => {
      const matchSearch = !searchQ || t.company_name.toLowerCase().includes(searchQ.toLowerCase());
      const matchType = filterType === 'All' || t.deal_type === filterType;
      return matchSearch && matchType;
    });
  }, [tombstones, searchQ, filterType]);

  // Selected items appear first in grid order, then unselected items below
  const orderedForSelection = useMemo(() => {
    const selectedInOrder = selectedIds
      .map((id) => filteredForSelection.find((t) => t.id === id))
      .filter(Boolean) as Tombstone[];
    const unselected = filteredForSelection.filter((t) => !selectedIds.includes(t.id));
    return [...selectedInOrder, ...unselected];
  }, [filteredForSelection, selectedIds]);

  const selectedTombstones = useMemo(
    () => selectedIds.map((id) => tombstones.find((t) => t.id === id)).filter(Boolean) as Tombstone[],
    [selectedIds, tombstones]
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= capacity) return prev;
      return [...prev, id];
    });
  };

  const selectAll = () => {
    const toAdd = filteredForSelection
      .map((t) => t.id)
      .filter((id) => !selectedIds.includes(id))
      .slice(0, capacity - selectedIds.length);
    setSelectedIds((prev) => [...prev, ...toAdd]);
  };

  const clearAll = () => setSelectedIds([]);

  const handlePresetChange = (preset: string) => {
    const [c, r] = parsePreset(preset);
    setCols(c);
    setRows(r);
    setSelectedIds((prev) => prev.slice(0, c * r));
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!gridRef.current || selectedTombstones.length === 0) return;
    setExporting(true);
    setExportMode(true);
  };

  useEffect(() => {
    if (!exportMode || !gridRef.current) return;
    const run = async () => {
      try {
        const SCALE = 3;
        const EXPORT_DPI = 96 * SCALE;
        const canvas = await html2canvas(gridRef.current!, {
          scale: SCALE, useCORS: true, backgroundColor: '#ffffff', logging: false,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const dpiPng = embedDpi(bytes, EXPORT_DPI);
        const blob = new Blob([dpiPng.buffer as ArrayBuffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `tombstones-page${activePage + 1}-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Export failed', e);
        alert('Export failed. Please try again.');
      } finally {
        setExporting(false);
        setExportMode(false);
      }
    };
    run();
  }, [exportMode]);

  const currentPreset = `${cols}×${rows}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200 shadow-sm flex-shrink-0 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Export PNG</h2>
          <p className="text-xs text-gray-500">
            Page {activePage + 1} of {pages.length} · {selectedTombstones.length} / {capacity} slots filled
          </p>
        </div>

        {/* Grid size */}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm font-medium text-gray-600">Grid:</span>
          <select
            value={PRESETS.includes(currentPreset as typeof PRESETS[number]) ? currentPreset : 'custom'}
            onChange={(e) => { if (e.target.value !== 'custom') handlePresetChange(e.target.value); }}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
            {!PRESETS.includes(currentPreset as typeof PRESETS[number]) && (
              <option value="custom">{currentPreset}</option>
            )}
          </select>
          <span className="text-sm text-gray-500">or</span>
          <div className="flex items-center gap-1">
            <input
              type="number" min={1} max={12} value={cols}
              onChange={(e) => { const v = Math.max(1, Math.min(12, +e.target.value)); setCols(v); setSelectedIds((p) => p.slice(0, v * rows)); }}
              className="w-12 text-sm text-center border border-gray-300 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500 text-sm">×</span>
            <input
              type="number" min={1} max={10} value={rows}
              onChange={(e) => { const v = Math.max(1, Math.min(10, +e.target.value)); setRows(v); setSelectedIds((p) => p.slice(0, cols * v)); }}
              className="w-12 text-sm text-center border border-gray-300 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-xs text-gray-400">(cols × rows)</span>
        </div>

        <div className="w-px h-8 bg-gray-200 mx-1" />

        {/* Text settings */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Text:</span>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Size</label>
            <input type="range" min={6} max={16} step={1} value={fontSize} onChange={(e) => setFontSize(+e.target.value)} className="w-20 accent-blue-600" />
            <span className="text-xs text-gray-700 w-6 text-center">{fontSize}px</span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Color</label>
            <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0.5 bg-white" title="Font color" />
            <span className="text-xs text-gray-500 font-mono">{fontColor}</span>
          </div>
          <span className="text-xs text-gray-400 italic">Avenir Book · Bold</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <X className="w-4 h-4 inline mr-1" />Close
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selectedTombstones.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" />Exporting…</>
              : <><Download className="w-4 h-4" />Download PNG</>
            }
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: selection panel ── */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

          {/* Page tabs */}
          <div className="px-2 pt-2 pb-1.5 border-b border-gray-100 flex items-center gap-1 flex-wrap">
            {pages.map((pageIds, i) => (
              <button
                key={i}
                onClick={() => setActivePage(i)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  activePage === i ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Page {i + 1}
                <span className="opacity-60">({pageIds.length})</span>
                {pages.length > 1 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); removePage(i); }}
                    className="ml-0.5 opacity-60 hover:opacity-100 leading-none"
                    title="Remove page"
                  >×</span>
                )}
              </button>
            ))}
            <button
              onClick={addPage}
              className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors font-medium"
              title="Add new page"
            >
              + Page
            </button>
          </div>

          {/* Search / filter / actions */}
          <div className="p-3 border-b border-gray-100 flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Tombstones</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text" placeholder="Search…" value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              {DEAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={selectAll} disabled={selectedIds.length >= capacity}
                className="flex-1 py-1 text-xs font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-40 transition-colors">
                Select All
              </button>
              <button onClick={clearAll} disabled={selectedIds.length === 0}
                className="flex-1 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Clear
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {selectedIds.length} selected · {Math.max(0, capacity - selectedIds.length)} slots remaining
            </p>
          </div>

          {/* Tombstone list */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
            {orderedForSelection.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No tombstones match</p>
            ) : (
              orderedForSelection.map((t) => {
                const isSelected = selectedIds.includes(t.id);
                const isFull = selectedIds.length >= capacity && !isSelected;
                return (
                  <div
                    key={t.id}
                    className="relative"
                    draggable={isSelected}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragSrcId(t.id); }}
                    onDragOver={(e) => {
                      if (!isSelected || !dragSrcId || dragSrcId === t.id) return;
                      e.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setDragOverId(t.id);
                      setDragOverPos(e.clientY < rect.top + rect.height / 2 ? 'before' : 'after');
                    }}
                    onDragLeave={clearDragOver}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!dragSrcId || dragSrcId === t.id || !isSelected) return;
                      setSelectedIds((prev) => {
                        const next = [...prev];
                        const from = next.indexOf(dragSrcId);
                        if (from === -1) return prev;
                        next.splice(from, 1);
                        const to = next.indexOf(t.id);
                        if (to === -1) return prev;
                        next.splice(dragOverPos === 'after' ? to + 1 : to, 0, dragSrcId);
                        return next;
                      });
                      setDragSrcId(null);
                      clearDragOver();
                    }}
                    onDragEnd={() => { setDragSrcId(null); clearDragOver(); }}
                    onMouseEnter={isSelected ? (e) => handleRowMouseEnter(e, t.id) : undefined}
                    onMouseLeave={isSelected ? handleRowMouseLeave : undefined}
                  >
                    {/* Drop indicator line */}
                    {dragOverId === t.id && dragOverPos === 'before' && (
                      <div className="absolute -top-px left-2 right-2 h-0.5 bg-blue-500 rounded-full z-10" />
                    )}
                    {dragOverId === t.id && dragOverPos === 'after' && (
                      <div className="absolute -bottom-px left-2 right-2 h-0.5 bg-blue-500 rounded-full z-10" />
                    )}
                    <div
                      onClick={() => !isFull && toggle(t.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors select-none ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300 cursor-grab'
                          : isFull
                          ? 'opacity-40 cursor-not-allowed border-gray-200'
                          : 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      {/* Drag handle — only visible for selected */}
                      {isSelected && (
                        <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 -ml-0.5" />
                      )}
                      {/* Tiny logo */}
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded border border-gray-100 overflow-hidden">
                        {t.logo_url ? (
                          <img src={t.logo_url} alt="" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <span className="text-xs font-bold text-gray-400">{t.company_name[0]}</span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{t.company_name}</p>
                        <p className="text-xs text-gray-400">{t.deal_type} · {t.deal_year}</p>
                      </div>
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: preview ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Zoom bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <span className="text-xs text-gray-500 mr-1">Zoom</span>
            <button onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))} className="p-1 rounded hover:bg-gray-200 transition-colors">
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <input type="range" min={0.25} max={3} step={0.25} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="w-28 accent-blue-600" />
            <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} className="p-1 rounded hover:bg-gray-200 transition-colors">
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs text-gray-700 w-10">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(1)} className="text-xs text-blue-600 hover:underline ml-1">Reset</button>
            {selectedTombstones.length > 0 && (
              <span className="text-xs text-gray-400 ml-auto">
                {selectedTombstones.length} tombstone{selectedTombstones.length !== 1 ? 's' : ''} · 3× resolution on export
              </span>
            )}
          </div>

          {/* Scrollable canvas */}
          <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
            {selectedTombstones.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                Select tombstones from the left panel to preview the export
              </div>
            ) : (() => {
              const gridW = cols * CARD_W + (cols - 1) * GAP + 40;
              const gridH = rows * CARD_H + (rows - 1) * GAP + 40;
              return (
                <div style={{ width: gridW * zoom, height: gridH * zoom, flexShrink: 0 }}>
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: gridW, height: gridH }}>
                    <div
                      ref={gridRef}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, ${CARD_W}px)`,
                        gridTemplateRows: `repeat(${rows}, ${CARD_H}px)`,
                        gap: GAP,
                        padding: 20,
                        background: '#ffffff',
                        width: gridW,
                      }}
                    >
                      {selectedTombstones.slice(0, capacity).map((t) => (
                        <ExportCard key={t.id} tombstone={t} settings={{ fontSize, fontColor, logoScale: getLogoScale(t.id) }} />
                      ))}
                      {Array.from({ length: Math.max(0, capacity - selectedTombstones.length) }).map((_, i) => (
                        exportMode
                          ? <div key={`empty-${i}`} style={{ background: '#ffffff', boxSizing: 'border-box' }} />
                          : <EmptyCell key={`empty-${i}`} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Fixed-position logo size slider */}
      {hoveredId && selectedIds.includes(hoveredId) && (
        <div
          style={{ position: 'fixed', top: sliderPos.top, left: sliderPos.left, transform: 'translateY(-50%)', zIndex: 9999 }}
          onMouseEnter={cancelHide}
          onMouseLeave={() => { hideTimerRef.current = setTimeout(() => setHoveredId(null), 120); }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 whitespace-nowrap">
            <span className="text-xs text-gray-500">Logo size</span>
            <input
              type="range" min={0.3} max={1.5} step={0.05}
              value={getLogoScale(hoveredId)}
              onChange={(e) => setLogoScale(hoveredId, +e.target.value)}
              className="w-24 accent-blue-600"
            />
            <span className="text-xs text-gray-700 w-8 text-right tabular-nums">
              {Math.round(getLogoScale(hoveredId) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
