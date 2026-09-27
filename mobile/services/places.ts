import { api } from '@/lib/api';
import type { PlaceResult } from '@/types';

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const rows = await api<unknown>(`/api/places?q=${encodeURIComponent(query)}&limit=8`);
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is PlaceResult => !!row && typeof row === 'object' && typeof (row as PlaceResult).name === 'string' && Number.isFinite((row as PlaceResult).lat) && Number.isFinite((row as PlaceResult).lon));
}
