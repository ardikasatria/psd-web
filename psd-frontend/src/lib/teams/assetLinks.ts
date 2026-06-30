/** Tautan buat aset tim — arahkan ke halaman yang benar (bukan /new yang tidak ada). */
export function teamAssetHref(kind: string, teamId: string): string {
  const q = new URLSearchParams({ team_id: teamId })
  switch (kind) {
    case 'project':
      return `/projects/new?${q}`
    case 'dataset':
      return `/datasets/new?${q}`
    case 'model':
      return `/models/new?${q}`
    case 'notebook':
      return `/notebooks/new?${q}`
    case 'idea_space':
      q.set('create', '1')
      return `/idea-rooms?${q}`
    case 'data_factory':
      q.set('create', '1')
      return `/factory/sources?${q}`
    case 'transformer_space':
      q.set('create', '1')
      return `/factory/pipelines?${q}`
    case 'model_registry':
      q.set('create', '1')
      return `/ml?${q}`
    case 'synthetic_data':
      q.set('create', '1')
      return `/synthesis?${q}`
    case 'analytics_space':
      q.set('create', '1')
      return `/analytics?${q}`
    case 'competition':
      return `/competitions?${q}`
    default:
      return `/projects/new?${q}`
  }
}
