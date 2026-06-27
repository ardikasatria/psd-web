'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QueryState } from '@/components/features/QueryState'
import { InterestChips } from '@/components/features/onboarding/InterestChips'
import { DetailPageHeader, DetailPageShell } from '@/components/features/layout'
import { SettingsShell } from '@/components/features/settings/SettingsShell'
import { ProfileCard } from '@/components/features/users/ProfileCard'
import { getMe } from '@/lib/api/auth'
import { updateProfile, uploadAvatar, uploadBanner } from '@/lib/api/me'
import { useAuthGuard } from '@/lib/auth/useAuthGuard'
import type { LinkItem, Profile, ProfileUpdate } from '@/types/api'
import { Button } from '@/shared/Button'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Textarea from '@/shared/Textarea'

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp']
const MAX_AVATAR = 2 * 1024 * 1024
const MAX_BANNER = 4 * 1024 * 1024
const HEX_RE = /^#([0-9A-Fa-f]{6})$/

function isValidUrl(value: string) {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const emptyDraft = (p: Profile): ProfileUpdate & { links: LinkItem[]; interests: string[] } => ({
  name: p.name,
  bio: p.bio ?? '',
  about_md: p.about_md ?? '',
  pronouns: p.pronouns ?? '',
  location: p.location ?? '',
  accent_color: p.accent_color ?? '#4572b7',
  status_emoji: p.status_emoji ?? '',
  status_text: p.status_text ?? '',
  links: p.links ?? [],
  interests: p.interests ?? [],
})

export function ProfileSettingsContent() {
  useAuthGuard()
  const qc = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null)
  const [previewBanner, setPreviewBanner] = useState<string | null>(null)

  const { data: meData, isLoading, isError, error: loadError } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  })
  const user = meData?.user

  const [draft, setDraft] = useState<ReturnType<typeof emptyDraft> | null>(null)

  useEffect(() => {
    if (user && !draft) setDraft(emptyDraft(user))
  }, [user, draft])

  const previewProfile = useMemo((): Profile | null => {
    if (!user || !draft) return null
    return {
      ...user,
      ...draft,
      bio: draft.bio || null,
      about_md: draft.about_md || null,
      pronouns: draft.pronouns || null,
      location: draft.location || null,
      status_emoji: draft.status_emoji || null,
      status_text: draft.status_text || null,
      avatar_url: previewAvatar ?? user.avatar_url,
      banner_url: previewBanner ?? user.banner_url,
      links: draft.links.filter((l) => l.label && l.url),
    }
  }, [user, draft, previewAvatar, previewBanner])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('draft kosong')
      if (draft.accent_color && !HEX_RE.test(draft.accent_color)) {
        throw new Error('Accent color harus format hex (#RRGGBB).')
      }
      for (const link of draft.links) {
        if (link.url && !isValidUrl(link.url)) {
          throw new Error(`URL tidak valid: ${link.label || link.url}`)
        }
      }
      const body: ProfileUpdate = {
        name: draft.name,
        bio: draft.bio || null,
        about_md: draft.about_md || null,
        pronouns: draft.pronouns || null,
        location: draft.location || null,
        accent_color: draft.accent_color || null,
        status_emoji: draft.status_emoji || null,
        status_text: draft.status_text || null,
        links: draft.links.filter((l) => l.label.trim() && l.url.trim()),
        interests: draft.interests ?? [],
      }
      return updateProfile(body)
    },
    onSuccess: async () => {
      setMessage('Profil tersimpan.')
      setError(null)
      await qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e: Error) => {
      setError(e.message)
      setMessage(null)
    },
  })

  const handleImage = async (kind: 'avatar' | 'banner', file: File) => {
    if (!ALLOWED_IMAGE.includes(file.type)) {
      setError('Format harus JPG, PNG, atau WebP.')
      return
    }
    const max = kind === 'avatar' ? MAX_AVATAR : MAX_BANNER
    if (file.size > max) {
      setError(`Ukuran maksimal ${kind === 'avatar' ? '2' : '4'} MB.`)
      return
    }
    const local = URL.createObjectURL(file)
    if (kind === 'avatar') setPreviewAvatar(local)
    else setPreviewBanner(local)
    setError(null)
    try {
      if (kind === 'avatar') {
        const res = await uploadAvatar(file)
        setPreviewAvatar(res.avatar_url)
      } else {
        const res = await uploadBanner(file)
        setPreviewBanner(res.banner_url)
      }
      await qc.invalidateQueries({ queryKey: ['me'] })
      setMessage(kind === 'avatar' ? 'Avatar diperbarui.' : 'Banner diperbarui.')
    } catch {
      setError('Gagal mengunggah gambar. Coba lagi.')
    }
  }

  const updateLink = (index: number, field: keyof LinkItem, value: string) => {
    if (!draft) return
    const links = [...draft.links]
    links[index] = { ...links[index], [field]: value }
    setDraft({ ...draft, links })
  }

  const addLink = () => {
    if (!draft) return
    setDraft({ ...draft, links: [...draft.links, { label: '', url: '' }] })
  }

  const removeLink = (index: number) => {
    if (!draft) return
    setDraft({ ...draft, links: draft.links.filter((_, i) => i !== index) })
  }

  if (isError) {
    return (
      <DetailPageShell>
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-600">
          <p className="text-neutral-600 dark:text-neutral-400">Masuk untuk mengedit profil.</p>
          <ButtonPrimary href="/login?next=/settings/profile" className="mt-4">
            Masuk
          </ButtonPrimary>
        </div>
      </DetailPageShell>
    )
  }

  return (
    <DetailPageShell>
      <DetailPageHeader
        title="Personalisasi profil"
        subtitle="Sesuaikan tampilan profil publik Anda — banner, status, accent color, dan lainnya."
      />

      <SettingsShell active="profile">
        <QueryState isLoading={isLoading} isError={false} error={loadError}>
          {draft && previewProfile && (
            <div className="grid gap-8 xl:grid-cols-2">
            <form
              className="space-y-6 rounded-3xl border border-neutral-200/80 bg-white p-6 lg:p-8 dark:border-neutral-700 dark:bg-neutral-800"
              onSubmit={(e) => {
                e.preventDefault()
                saveMutation.mutate()
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <Label>Avatar (≤2MB)</Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-1 !rounded-xl"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleImage('avatar', f)
                    }}
                  />
                </Field>
                <Field>
                  <Label>Banner (≤4MB)</Label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-1 !rounded-xl"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleImage('banner', f)
                    }}
                  />
                </Field>
              </div>

              <Field>
                <Label>Nama</Label>
                <Input
                  value={draft.name ?? ''}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1 !rounded-xl"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <Label>Pronouns</Label>
                  <Input
                    value={draft.pronouns ?? ''}
                    onChange={(e) => setDraft({ ...draft, pronouns: e.target.value })}
                    placeholder="dia/dia"
                    className="mt-1 !rounded-xl"
                  />
                </Field>
                <Field>
                  <Label>Lokasi</Label>
                  <Input
                    value={draft.location ?? ''}
                    onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                    placeholder="Bandar Lampung"
                    className="mt-1 !rounded-xl"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <Label>Emoji status</Label>
                  <Input
                    value={draft.status_emoji ?? ''}
                    onChange={(e) => setDraft({ ...draft, status_emoji: e.target.value })}
                    placeholder="🌱"
                    className="mt-1 !rounded-xl"
                  />
                </Field>
                <Field>
                  <Label>Teks status</Label>
                  <Input
                    value={draft.status_text ?? ''}
                    onChange={(e) => setDraft({ ...draft, status_text: e.target.value })}
                    placeholder="Sedang belajar ML"
                    className="mt-1 !rounded-xl"
                  />
                </Field>
              </div>

              <Field>
                <Label>Accent color</Label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={draft.accent_color ?? '#4572b7'}
                    onChange={(e) => setDraft({ ...draft, accent_color: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200 dark:border-neutral-600"
                  />
                  <Input
                    value={draft.accent_color ?? ''}
                    onChange={(e) => setDraft({ ...draft, accent_color: e.target.value })}
                    placeholder="#4572b7"
                    className="!rounded-xl"
                  />
                </div>
              </Field>

              <Field>
                <Label>Bio (satu baris)</Label>
                <Input
                  value={draft.bio ?? ''}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  className="mt-1 !rounded-xl"
                />
              </Field>

              <Field>
                <Label>Tentang (markdown)</Label>
                <Textarea
                  value={draft.about_md ?? ''}
                  onChange={(e) => setDraft({ ...draft, about_md: e.target.value })}
                  rows={6}
                  className="mt-1 !rounded-xl"
                />
              </Field>

              <Field>
                <Label>Minat</Label>
                <p className="mt-1 mb-3 text-xs text-neutral-500">
                  Pilih domain yang ingin Anda eksplorasi — membantu personalisasi rekomendasi.
                </p>
                <InterestChips
                  value={draft.interests ?? []}
                  onChange={(interests) => setDraft({ ...draft, interests })}
                />
              </Field>

              <Field>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Links</Label>
                  <Button type="button" outline onClick={addLink}>
                    Tambah link
                  </Button>
                </div>
                <div className="space-y-3">
                  {draft.links.map((link, i) => (
                    <div key={i} className="flex flex-wrap gap-2">
                      <Input
                        value={link.label}
                        onChange={(e) => updateLink(i, 'label', e.target.value)}
                        placeholder="Label"
                        className="min-w-[120px] flex-1 !rounded-xl"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                        placeholder="https://..."
                        className="min-w-[180px] flex-[2] !rounded-xl"
                      />
                      <Button type="button" outline onClick={() => removeLink(i)}>
                        Hapus
                      </Button>
                    </div>
                  ))}
                </div>
              </Field>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}

              <div className="flex justify-end border-t border-neutral-200 pt-6 dark:border-neutral-700">
                <ButtonPrimary type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan profil'}
                </ButtonPrimary>
              </div>
            </form>

            <div
              className="xl:sticky xl:top-24 xl:self-start"
              style={{ ['--psd-accent' as string]: draft.accent_color ?? '#4572b7' }}
            >
              <p className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Pratinjau langsung</p>
              <ProfileCard profile={previewProfile} compact />
            </div>
          </div>
        )}
      </QueryState>
      </SettingsShell>
    </DetailPageShell>
  )
}
