'use client'

import { QueryState } from '@/components/features/QueryState'
import { listTeamFiles } from '@/lib/api/teams'
import { teamCard, teamDivider, teamText, teamTextMuted } from '@/lib/teams/team-ui'
import { DocumentIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TeamFilesTab({ slug }: { slug: string }) {
  const filesQuery = useQuery({
    queryKey: ['team-files', slug],
    queryFn: async () => (await listTeamFiles(slug)).items,
  })

  return (
    <QueryState
      isLoading={filesQuery.isLoading}
      isError={filesQuery.isError}
      error={filesQuery.error}
      isEmpty={!filesQuery.data?.length}
      emptyTitle="Belum ada file"
      emptyDescription="File yang dilampirkan di diskusi akan muncul di sini."
    >
      <ul className={`divide-y ${teamDivider} ${teamCard}`}>
        {(filesQuery.data ?? []).map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-700">
                <DocumentIcon className="size-4 text-neutral-500" />
              </div>
              <div className="min-w-0">
                <p className={`truncate font-medium ${teamText}`}>{f.filename}</p>
                <p className={`text-sm ${teamTextMuted}`}>
                  {f.uploader.name ?? f.uploader.username} · {formatSize(f.size_bytes)}
                  {f.created_at && ` · ${new Date(f.created_at).toLocaleDateString('id-ID')}`}
                </p>
              </div>
            </div>
            {f.download_url && (
              <a
                href={f.download_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Unduh
              </a>
            )}
          </li>
        ))}
      </ul>
    </QueryState>
  )
}
