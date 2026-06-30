import { redirect } from 'next/navigation'

/** Legacy — kernel server hanya lewat editor PSD, bukan UI JupyterHub. */
export default function NotebookOpenHubPage() {
  redirect('/notebooks/workspace')
}
