import {
  AssetBranchSchema,
  AssetContributorSchema,
  AssetFileSchema,
  AssetReadmeSchema,
  AssetTreeSchema,
  AssetVersionSchema,
  RepoKind,
} from '@/types/api'
import { z } from 'zod'
import { apiFetch } from './client'

export type AssetKindPath = 'projects' | 'datasets' | 'models'

export function assetKindPath(kind: RepoKind): AssetKindPath {
  if (kind === 'project') return 'projects'
  if (kind === 'dataset') return 'datasets'
  return 'models'
}

function refQuery(ref?: string) {
  return ref ? `?ref=${encodeURIComponent(ref)}` : ''
}

function fileQuery(path: string, ref?: string) {
  const q = new URLSearchParams({ path })
  if (ref) q.set('ref', ref)
  return `?${q}`
}

export const getAssetReadme = (kind: AssetKindPath, owner: string, slug: string, ref?: string) =>
  apiFetch(`/${kind}/${owner}/${slug}/readme${refQuery(ref)}`, AssetReadmeSchema)

export const getAssetTree = (kind: AssetKindPath, owner: string, slug: string, ref?: string) =>
  apiFetch(`/${kind}/${owner}/${slug}/tree${refQuery(ref)}`, AssetTreeSchema)

export const getAssetFile = (kind: AssetKindPath, owner: string, slug: string, path: string, ref?: string) =>
  apiFetch(`/${kind}/${owner}/${slug}/file${fileQuery(path, ref)}`, AssetFileSchema)

export const getAssetBranches = (kind: AssetKindPath, owner: string, slug: string) =>
  apiFetch(`/${kind}/${owner}/${slug}/branches`, z.array(AssetBranchSchema))

export const createAssetBranch = (
  kind: AssetKindPath,
  owner: string,
  slug: string,
  name: string,
  from: string,
) =>
  apiFetch(`/${kind}/${owner}/${slug}/branches`, AssetBranchSchema, {
    method: 'POST',
    body: JSON.stringify({ name, from }),
  })

export const getAssetVersions = (kind: AssetKindPath, owner: string, slug: string) =>
  apiFetch(`/${kind}/${owner}/${slug}/versions`, z.array(AssetVersionSchema))

export const getAssetContributors = (kind: AssetKindPath, owner: string, slug: string) =>
  apiFetch(`/${kind}/${owner}/${slug}/contributors`, z.array(AssetContributorSchema))
