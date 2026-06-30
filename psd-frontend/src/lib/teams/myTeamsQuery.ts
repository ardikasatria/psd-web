import { getMyTeams } from '@/lib/api/teams'
import type { MyTeam } from '@/types/api'

/** Satu bentuk cache untuk semua konsumen React Query `my-teams`. */
export const MY_TEAMS_QUERY_KEY = ['my-teams'] as const

export async function fetchMyTeams(): Promise<MyTeam[]> {
  const res = await getMyTeams()
  return res.items as MyTeam[]
}

/** Normalisasi data cache lama (objek paginated) atau array. */
export function myTeamsFromCache(data: unknown): MyTeam[] {
  if (Array.isArray(data)) return data as MyTeam[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: MyTeam[] }).items
  }
  return []
}
