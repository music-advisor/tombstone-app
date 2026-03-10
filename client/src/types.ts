export interface Tombstone {
  id: string;
  company_name: string;
  deal_type: string;
  deal_size_millions: number | null;
  deal_year: number;
  logo_url: string | null;
  role: string;
  created_at: string;
}

export interface Filters {
  search: string;
  dealType: string;
  year: string;
  minSize: string;
  maxSize: string;
}

export const DEAL_TYPES = [
  'A - Sale',
  'B - Equity',
  'C - Debt',
  'D - Buyside',
] as const;

export function formatDealSize(millions: number | null): string {
  if (millions === null || millions === undefined) return '';
  if (millions >= 1000) {
    const billions = millions / 1000;
    return `$${billions % 1 === 0 ? billions.toFixed(0) : billions.toFixed(1)}B`;
  }
  return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
}
