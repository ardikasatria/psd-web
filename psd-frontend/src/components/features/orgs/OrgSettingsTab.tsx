'use client'

import { presignOrgDoc, submitVerification, updateOrgSettings, deleteOrg, transferOrg } from '@/lib/api/orgs'
import { orgCan, orgRoleLabel } from '@/lib/orgs/permissions'
import { ACCESS_LEVELS, requiresVerification } from '@/lib/orgs/org-utils'
import { orgCard, orgText, orgTextMuted } from '@/lib/orgs/org-ui'
import { OrgVerificationBadge } from '@/components/features/orgs/OrgVerificationBadge'
import { MY_ORGS_QUERY_KEY } from '@/components/features/orgs/MyOrgsPage'
import { OrgDetail } from '@/types/api'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Textarea from '@/shared/Textarea'
import Select from '@/shared/Select'
import { ConfirmDialog } from '@/components/admin/AdminShared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function OrgSettingsTab({
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
  const router = useRouter()
  const qc = useQueryClient()
  const [name, setName] = useState(org.name)
  const [description, setDescription] = useState(org.description ?? '')
  const [basePermission, setBasePermission] = useState(org.base_permission ?? '')
  const [docKeys, setDocKeys] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['org', handle] })
    qc.invalidateQueries({ queryKey: MY_ORGS_QUERY_KEY })
  }

  const saveMut = useMutation({
    mutationFn: () =>
      updateOrgSettings(orgId, {
        name: name.trim(),
        description: description.trim(),
        base_permission: basePermission || null,
      }),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const verifyMut = useMutation({
    mutationFn: () => submitVerification(orgId, docKeys),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteOrg(orgId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MY_ORGS_QUERY_KEY })
      router.push('/me/orgs')
    },
    onError: (e: Error) => setError(e.message),
  })

  const transferMut = useMutation({
    mutationFn: (uid: string) => transferOrg(orgId, uid),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  })

  async function handleFileUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const presign = await presignOrgDoc(orgId, file.name)
      await fetch(presign.upload_url, { method: 'PUT', body: file })
      setDocKeys((prev) => [...prev, presign.storage_key])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengunggah')
    } finally {
      setUploading(false)
    }
  }

  const canSettings = orgCan(myRole, 'manage_settings')
  const canVerify = orgCan(myRole, 'manage_verification')
  const canBilling = orgCan(myRole, 'manage_billing')
  const canDelete = orgCan(myRole, 'delete_org')

  return (
    <div className="space-y-8">
      {org.verification === 'pending' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Verifikasi sedang ditinjau admin platform.
        </div>
      )}

      {canSettings && (
        <section className={`${orgCard} space-y-4 p-5`}>
          <h3 className={`text-sm font-semibold ${orgText}`}>Profil organisasi</h3>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="!rounded-xl" />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="!rounded-xl"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Base permission anggota
            </label>
            <Select
              value={basePermission}
              onChange={(e) => setBasePermission(e.target.value)}
              className="!rounded-xl"
            >
              <option value="">Tidak ada (default)</option>
              {ACCESS_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <ButtonPrimary type="button" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Simpan pengaturan
          </ButtonPrimary>
        </section>
      )}

      {canVerify && requiresVerification(org.type) && (
        <section className={`${orgCard} space-y-4 p-5`}>
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-semibold ${orgText}`}>Verifikasi KYC</h3>
            <OrgVerificationBadge status={org.verification} />
          </div>
          <p className={`text-sm ${orgTextMuted}`}>
            Unggah dokumen (akta, NIB, NPWP, dll.) untuk verifikasi organisasi.
          </p>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            disabled={uploading || !['unverified', 'rejected'].includes(org.verification)}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileUpload(f)
            }}
            className="text-sm"
          />
          {docKeys.length > 0 && (
            <ul className={`text-sm ${orgTextMuted}`}>
              {docKeys.map((k) => (
                <li key={k}>✓ {k.split('/').pop()}</li>
              ))}
            </ul>
          )}
          <ButtonPrimary
            type="button"
            onClick={() => verifyMut.mutate()}
            disabled={verifyMut.isPending || docKeys.length === 0 || !['unverified', 'rejected'].includes(org.verification)}
          >
            Ajukan verifikasi
          </ButtonPrimary>
        </section>
      )}

      {canBilling && (
        <section className={`${orgCard} p-5`}>
          <h3 className={`text-sm font-semibold ${orgText}`}>Tagihan</h3>
          <p className={`mt-2 text-sm ${orgTextMuted}`}>
            Kelola paket dan tagihan organisasi — terhubung ke modul billing platform.
          </p>
          <ButtonPrimary href="/settings" outline className="mt-3">
            Buka pengaturan tagihan
          </ButtonPrimary>
        </section>
      )}

      {orgCan(myRole, 'transfer_ownership') && (org.members ?? []).length > 1 && (
        <section className={`${orgCard} space-y-4 p-5`}>
          <h3 className={`text-sm font-semibold ${orgText}`}>Transfer kepemilikan</h3>
          <p className={`text-sm ${orgTextMuted}`}>
            Alihkan peran owner ke anggota lain. Anda akan menjadi admin setelah transfer.
          </p>
          <Select
            defaultValue=""
            onChange={(e) => {
              const uid = e.target.value
              if (uid) transferMut.mutate(uid)
            }}
            className="!rounded-xl"
          >
            <option value="">Pilih anggota…</option>
            {(org.members ?? [])
              .filter((m) => m.role !== 'owner')
              .map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  @{m.username} ({orgRoleLabel[m.role]})
                </option>
              ))}
          </Select>
        </section>
      )}

      {canDelete && (
        <section className={`${orgCard} border-red-200 p-5 dark:border-red-900`}>
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Zona berbahaya</h3>
          <p className={`mt-2 text-sm ${orgTextMuted}`}>
            Hapus organisasi secara permanen. Semua anggota akan kehilangan akses.
          </p>
          <ConfirmDialog
            label="Hapus organisasi"
            danger
            confirm={`Hapus organisasi "${org.name}"? Tindakan ini tidak dapat dibatalkan.`}
            onConfirm={() => deleteMut.mutate()}
          />
        </section>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
