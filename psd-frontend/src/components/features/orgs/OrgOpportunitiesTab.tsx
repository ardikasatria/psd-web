'use client'

import { createOpportunity, listOrgApplications } from '@/lib/api/orgs'
import { orgCan } from '@/lib/orgs/permissions'
import { canPostOpportunity } from '@/lib/orgs/org-utils'
import { orgCard, orgText, orgTextMuted } from '@/lib/orgs/org-ui'
import { OrgDetail, Opportunity, OrgApplication } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

export function OrgOpportunitiesTab({
  orgId,
  handle,
  org,
  myRole,
}: {
  orgId: string
  handle: string
  org: OrgDetail
  myRole: string | null | undefined
}) {
  const opportunities = org.opportunities ?? []
  const verified = canPostOpportunity(org.type, org.verification)
  const canPost = orgCan(myRole, 'post_opportunity')
  const canRecruit = orgCan(myRole, 'manage_recruitment')
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const applications = useQuery({
    queryKey: ['org', handle, 'applications'],
    queryFn: async () => {
      const res = await listOrgApplications(orgId)
      return res.items
    },
    enabled: canRecruit,
  })

  const createMut = useMutation({
    mutationFn: () => createOpportunity(orgId, { title: title.trim(), description: description.trim() }),
    onSuccess: () => {
      setShowForm(false)
      setTitle('')
      setDescription('')
      qc.invalidateQueries({ queryKey: ['org', handle] })
    },
    onError: (e: Error) => setError(e.message),
  })

  return (
    <div className="space-y-6">
      {canPost && (
        <div className={`${orgCard} p-4`}>
          {!verified ? (
            <div>
              <p className={`text-sm ${orgTextMuted}`}>
                Organisasi harus <strong>terverifikasi</strong> sebelum bisa memasang peluang.
              </p>
              <ButtonPrimary href={`/orgs/${handle}?tab=settings`} outline className="mt-3">
                Ajukan verifikasi →
              </ButtonPrimary>
            </div>
          ) : (
            <>
              <ButtonPrimary
                type="button"
                onClick={() => setShowForm((v) => !v)}
                disabled={!verified}
                title={!verified ? 'Butuh verifikasi' : undefined}
              >
                {showForm ? 'Batal' : 'Buat peluang'}
              </ButtonPrimary>
              {showForm && (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    createMut.mutate()
                  }}
                >
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Judul peluang"
                    className="!rounded-xl"
                  />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Deskripsi & kebutuhan"
                    className="!rounded-xl"
                  />
                  <ButtonPrimary type="submit" disabled={createMut.isPending || !title.trim()}>
                    Publikasikan
                  </ButtonPrimary>
                </form>
              )}
            </>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="space-y-3">
        {opportunities.map((op: Opportunity) => (
          <div key={op.id} className={`${orgCard} p-4`}>
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-semibold ${orgText}`}>{op.title}</h3>
              <Badge color={op.status === 'open' ? 'emerald' : 'zinc'}>{op.status}</Badge>
            </div>
            <p className={`mt-2 text-sm ${orgTextMuted}`}>{op.description}</p>
            {(op.skills ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(op.skills ?? []).map((s) => (
                  <Badge key={s} color="sky">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
        {!opportunities.length && (
          <p className={`text-sm ${orgTextMuted}`}>Belum ada peluang yang dipasang.</p>
        )}
      </div>

      {canRecruit && (applications.data ?? []).length > 0 && (
        <section>
          <h3 className={`mb-3 text-sm font-semibold ${orgText}`}>Pelamar</h3>
          <ul className={`divide-y rounded-2xl border border-neutral-200/80 bg-white dark:divide-neutral-700 dark:border-neutral-700 dark:bg-neutral-800`}>
            {(applications.data ?? []).map((app: OrgApplication) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <Link
                    href={`/u/${app.applicant.username}`}
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    @{app.applicant.username}
                  </Link>
                  <p className={`text-xs ${orgTextMuted}`}>{app.opportunity_title}</p>
                </div>
                <Badge color="amber">{app.status}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
