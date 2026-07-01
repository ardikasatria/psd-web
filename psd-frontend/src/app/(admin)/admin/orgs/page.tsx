'use client'

import {
  AdminContentCard,
  AdminPageHeader,
  AdminPageSkeleton,
  AdminTable,
  AdminTableEmpty,
  AdminTableFooter,
  AdminTableToolbar,
  ConfirmDialog,
} from '@/components/admin/AdminShared'
import { OrgVerificationBadge } from '@/components/features/orgs/OrgVerificationBadge'
import {
  adminApproveVerify,
  adminListOrgs,
  adminRejectVerify,
  adminRestoreOrg,
  adminRevokeVerify,
  adminSuspendOrg,
  adminVerifyQueue,
} from '@/lib/api/orgs'
import { orgTypeLabel } from '@/lib/orgs/org-utils'
import { useAdminGuard } from '@/lib/auth/useAdminGuard'
import { AdminOrg, OrgVerificationQueue } from '@/types/api'
import { Badge } from '@/shared/Badge'
import Input from '@/shared/Input'
import Select from '@/shared/Select'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminOrgsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [verificationFilter, setVerificationFilter] = useState('')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const qc = useQueryClient()

  const orgs = useQuery({
    queryKey: ['admin', 'orgs', q, typeFilter, verificationFilter],
    queryFn: () =>
      adminListOrgs({
        q: q || undefined,
        type: typeFilter || undefined,
        verification: verificationFilter || undefined,
      }),
    enabled: !!user,
  })

  const queue = useQuery({
    queryKey: ['admin', 'orgs', 'verification'],
    queryFn: async () => {
      const res = await adminVerifyQueue()
      return res.items as OrgVerificationQueue[]
    },
    enabled: !!user,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'orgs'] })
    qc.invalidateQueries({ queryKey: ['org'] })
  }

  const approve = useMutation({
    mutationFn: (id: string) => adminApproveVerify(id),
    onSuccess: invalidate,
  })

  const reject = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => adminRejectVerify(id, note),
    onSuccess: () => {
      setRejectId(null)
      invalidate()
    },
  })

  const revoke = useMutation({
    mutationFn: (id: string) => adminRevokeVerify(id),
    onSuccess: invalidate,
  })

  const suspend = useMutation({
    mutationFn: (id: string) => adminSuspendOrg(id),
    onSuccess: invalidate,
  })

  const restore = useMutation({
    mutationFn: (id: string) => adminRestoreOrg(id),
    onSuccess: invalidate,
  })

  if (guardLoading || !user) return <AdminPageSkeleton />

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Organisasi"
        description="Kelola organisasi platform, antrian verifikasi KYC, dan moderasi."
      />

      {(queue.data ?? []).length > 0 && (
        <AdminContentCard>
          <h3 className="mb-4 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Antrian verifikasi ({queue.data?.length})
          </h3>
          <div className="space-y-4">
            {(queue.data ?? []).map((item: OrgVerificationQueue) => (
              <div
                key={item.id}
                className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/orgs/${item.org_handle}`}
                      className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {item.org_name}
                    </Link>
                    <p className="text-xs text-neutral-500">
                      @{item.org_handle} · {orgTypeLabel[item.org_type as keyof typeof orgTypeLabel]}
                    </p>
                  </div>
                  <OrgVerificationActions
                    orgName={item.org_name}
                    verification="pending"
                    onApprove={() => approve.mutate(item.org_id)}
                    onReject={(note) => reject.mutate({ id: item.org_id, note })}
                    onRevoke={() => revoke.mutate(item.org_id)}
                    rejectOpen={rejectId === item.org_id}
                    onRejectOpen={() => setRejectId(item.org_id)}
                    onRejectCancel={() => setRejectId(null)}
                    pending={approve.isPending || reject.isPending}
                  />
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {(item.doc_urls ??
                    item.doc_keys.map((k: string) => ({ key: k, url: '#' }))).map((d: { key: string; url: string }) => (
                    <li key={d.key}>
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {d.key.split('/').pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </AdminContentCard>
      )}

      {orgs.isLoading ? (
        <AdminPageSkeleton />
      ) : (
        <AdminContentCard>
          <AdminTableToolbar>
            <Input
              type="search"
              placeholder="Cari nama, handle, owner…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!w-full !max-w-md !rounded-xl sm:!w-auto"
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="!rounded-lg"
            >
              <option value="">Semua tipe</option>
              {Object.entries(orgTypeLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="!rounded-lg"
            >
              <option value="">Semua verifikasi</option>
              <option value="unverified">Belum terverifikasi</option>
              <option value="pending">Pending</option>
              <option value="verified">Terverifikasi</option>
              <option value="rejected">Ditolak</option>
            </Select>
          </AdminTableToolbar>
          <AdminTable>
            <TableHead>
              <TableRow>
                <TableHeader>Organisasi</TableHeader>
                <TableHeader>Tipe</TableHeader>
                <TableHeader>Verifikasi</TableHeader>
                <TableHeader>Owner</TableHeader>
                <TableHeader>Anggota</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Aksi</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(orgs.data?.items ?? []).map((o: AdminOrg) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link
                      href={`/orgs/${o.handle}`}
                      className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                    >
                      {o.name}
                    </Link>
                    <p className="text-xs text-neutral-500">@{o.handle}</p>
                  </TableCell>
                  <TableCell>
                    <Badge color="sky">{orgTypeLabel[o.type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <OrgVerificationBadge status={o.verification} />
                  </TableCell>
                  <TableCell>@{o.owner_username}</TableCell>
                  <TableCell>{o.member_count}</TableCell>
                  <TableCell>
                    {o.suspended ? (
                      <Badge color="red">Ditangguhkan</Badge>
                    ) : (
                      <Badge color="emerald">Aktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[12rem] flex-col gap-2">
                      <OrgVerificationActions
                        orgName={o.name}
                        verification={o.verification}
                        onApprove={() => approve.mutate(o.id)}
                        onReject={(note) => reject.mutate({ id: o.id, note })}
                        onRevoke={() => revoke.mutate(o.id)}
                        rejectOpen={rejectId === o.id}
                        onRejectOpen={() => setRejectId(o.id)}
                        onRejectCancel={() => setRejectId(null)}
                        pending={approve.isPending || reject.isPending || revoke.isPending}
                      />
                      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                      {o.suspended ? (
                        <button
                          type="button"
                          className="text-sm text-primary-600 dark:text-primary-400"
                          onClick={() => restore.mutate(o.id)}
                        >
                          Pulihkan
                        </button>
                      ) : (
                        <ConfirmDialog
                          label="Suspend"
                          danger
                          confirm={`Tangguhkan organisasi "${o.name}"?`}
                          onConfirm={() => suspend.mutate(o.id)}
                        />
                      )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </AdminTable>
          {!orgs.data?.items.length ? (
            <AdminTableEmpty>Tidak ada organisasi.</AdminTableEmpty>
          ) : (
            <AdminTableFooter>
              <span>
                Menampilkan{' '}
                <span className="font-medium text-neutral-900 dark:text-neutral-200">
                  {orgs.data.items.length}
                </span>{' '}
                organisasi
              </span>
            </AdminTableFooter>
          )}
        </AdminContentCard>
      )}
    </div>
  )
}

type VerificationStatus = AdminOrg['verification']

function OrgVerificationActions({
  orgName,
  verification,
  onApprove,
  onReject,
  onRevoke,
  rejectOpen,
  onRejectOpen,
  onRejectCancel,
  pending,
}: {
  orgName: string
  verification: VerificationStatus
  onApprove: () => void
  onReject: (note: string) => void
  onRevoke: () => void
  rejectOpen: boolean
  onRejectOpen: () => void
  onRejectCancel: () => void
  pending: boolean
}) {
  const [note, setNote] = useState('')

  const handleRejectCancel = () => {
    setNote('')
    onRejectCancel()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {verification !== 'verified' && (
          <ConfirmDialog
            label={verification === 'pending' ? 'Setujui' : 'Verifikasi'}
            confirm={`Tandai "${orgName}" sebagai sudah diverifikasi?`}
            onConfirm={onApprove}
            disabled={pending}
          />
        )}
        {verification === 'pending' && !rejectOpen && (
          <button
            type="button"
            disabled={pending}
            onClick={onRejectOpen}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
          >
            Tolak
          </button>
        )}
        {verification === 'verified' && (
          <ConfirmDialog
            label="Cabut verifikasi"
            confirm={`Cabut verifikasi "${orgName}"? Status kembali ke belum terverifikasi.`}
            onConfirm={onRevoke}
            disabled={pending}
          />
        )}
      </div>
      {rejectOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan penolakan"
            className="!max-w-xs !rounded-lg"
          />
          <button
            type="button"
            disabled={pending || !note.trim()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            onClick={() => {
              onReject(note.trim())
              setNote('')
            }}
          >
            Kirim penolakan
          </button>
          <button type="button" className="text-sm text-neutral-500" onClick={handleRejectCancel}>
            Batal
          </button>
        </div>
      )}
    </div>
  )
}
