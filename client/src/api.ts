import type { Tombstone, Filters } from './types';

const BASE = '/api';

export async function fetchTombstones(filters?: Partial<Filters>): Promise<Tombstone[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.dealType && filters.dealType !== 'All') params.append('dealType', filters.dealType);
  if (filters?.year && filters.year !== 'All') params.append('year', filters.year);
  if (filters?.minSize) params.append('minSize', filters.minSize);
  if (filters?.maxSize) params.append('maxSize', filters.maxSize);

  const res = await fetch(`${BASE}/tombstones?${params}`);
  if (!res.ok) throw new Error('Failed to fetch tombstones');
  return res.json();
}

export async function createTombstone(data: Omit<Tombstone, 'id' | 'created_at'>): Promise<Tombstone> {
  const res = await fetch(`${BASE}/tombstones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create tombstone');
  }
  return res.json();
}

export async function updateTombstone(id: string, data: Omit<Tombstone, 'id' | 'created_at'>): Promise<Tombstone> {
  const res = await fetch(`${BASE}/tombstones/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update tombstone');
  }
  return res.json();
}

export async function deleteTombstone(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tombstones/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete tombstone');
}

export async function uploadLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Failed to upload logo');
  const data = await res.json();
  return data.url as string;
}
