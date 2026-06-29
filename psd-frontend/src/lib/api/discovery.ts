import {
  DiscoveryPanels,
  DiscoveryPanelsSchema,
  PaginatedDiscovery,
  PaginatedDiscoverySchema,
} from '@/types/api'
import { apiFetch, buildQuery } from './client'

export type DiscoveryKind = 'top-tier' | 'popular' | 'new' | 'achievements' | 'similar'

export const getDiscoveryPanels = (limit = 8) =>
  apiFetch<DiscoveryPanels>(`/discovery/panels${buildQuery({ limit })}`, DiscoveryPanelsSchema)

export const getDiscoveryList = (kind: DiscoveryKind, page = 1) =>
  apiFetch<PaginatedDiscovery>(`/discovery/${kind}${buildQuery({ page })}`, PaginatedDiscoverySchema)

export const DISCOVERY_KIND_META: Record<
  DiscoveryKind,
  { title: string; subtitle: string; panelKey: keyof DiscoveryPanels | null }
> = {
  'top-tier': {
    title: 'Tier teratas',
    subtitle: 'Kontributor dengan reputasi tertinggi di PSD.',
    panelKey: 'top_tier',
  },
  popular: {
    title: 'Populer',
    subtitle: 'Anggota dengan pengikut dan engagement terbanyak.',
    panelKey: 'popular',
  },
  new: {
    title: 'Anggota baru',
    subtitle: 'Bergabung dalam 14 hari terakhir.',
    panelKey: 'new_members',
  },
  achievements: {
    title: 'Pencapaian',
    subtitle: 'Baru meraih badge atau penghargaan.',
    panelKey: 'achievements',
  },
  similar: {
    title: 'Orang serupa',
    subtitle: 'Sesama institusi atau organisasi dengan Anda.',
    panelKey: 'affiliation',
  },
}
