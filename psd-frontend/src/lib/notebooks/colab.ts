/** Deteksi apakah URL GitHub .ipynb akan menghasilkan tombol Colab aktif. */
const GH = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+\.ipynb)$/

export function previewColabUrl(sourceUrl: string): string | null {
  const trimmed = sourceUrl.trim()
  if (!trimmed) return null
  const m = trimmed.match(GH)
  if (!m) return null
  const [, owner, repo, rest] = m
  return `https://colab.research.google.com/github/${owner}/${repo}/blob/${rest}`
}

export const GITHUB_IPYNB_HINT =
  'https://github.com/{owner}/{repo}/blob/{branch}/path/notebook.ipynb'
