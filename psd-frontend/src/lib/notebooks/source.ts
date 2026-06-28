/** Pola URL berkas .ipynb di Git (Gitea PSD atau GitHub) untuk katalog notebook. */
export const GIT_IPYNB_HINT =
  'https://git.example.com/pemilik/repo/src/branch/notebook.ipynb'

const GIT_IPYNB = /\.ipynb(\?|$|#)/i

export function isGitNotebookUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const u = new URL(trimmed)
    return (u.hostname.includes('git.') || u.hostname === 'github.com') && GIT_IPYNB.test(u.pathname)
  } catch {
    return false
  }
}
