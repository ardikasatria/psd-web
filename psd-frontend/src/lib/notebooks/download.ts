import { getNotebookContent } from '@/lib/api/notebooks'

const GH_BLOB = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/

export function notebookDownloadUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim()
  const m = trimmed.match(GH_BLOB)
  if (m) {
    const [, owner, repo, rest] = m
    return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`
  }
  return trimmed
}

function safeFilename(title: string) {
  const base = title.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase()
  return base || 'notebook'
}

export async function downloadNotebookFile(notebook: {
  id: string
  title: string
  source_url: string | null
}) {
  if (notebook.source_url) {
    window.open(notebookDownloadUrl(notebook.source_url), '_blank', 'noopener,noreferrer')
    return
  }

  const { content } = await getNotebookContent(notebook.id)
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: 'application/x-ipynb+json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFilename(notebook.title)}.ipynb`
  anchor.click()
  URL.revokeObjectURL(url)
}
