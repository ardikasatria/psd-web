'use client'

import { InterestChips } from '@/components/features/onboarding/InterestChips'
import { completeOnboarding, updateProfile, uploadAvatar } from '@/lib/api/me'
import { useAuth } from '@/lib/auth/useAuth'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/shared/dialog'
import { Field, Label } from '@/shared/fieldset'
import Textarea from '@/shared/Textarea'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const STEPS = ['welcome', 'profile', 'interests', 'start'] as const
type Step = (typeof STEPS)[number]

export function OnboardingWelcome() {
  const pathname = usePathname()
  const { user, isLoading, isLoggedIn } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('welcome')
  const [bio, setBio] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  useEffect(() => {
    if (!isLoading && isLoggedIn && user && user.onboarded === false) {
      setBio(user.bio ?? '')
      setSelectedInterests(user.interests ?? [])
      setOpen(true)
    }
  }, [isLoading, isLoggedIn, user, pathname])

  const finish = useMutation({
    mutationFn: async () => {
      await completeOnboarding()
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['me'] })
      await qc.invalidateQueries({ queryKey: ['onboarding'] })
      setOpen(false)
    },
  })

  const saveProfile = useMutation({
    mutationFn: async (file?: File | null) => {
      if (bio.trim()) await updateProfile({ bio: bio.trim() })
      if (file) await uploadAvatar(file)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })

  const saveInterests = useMutation({
    mutationFn: () => updateProfile({ interests: selectedInterests }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })

  const handleSkip = () => finish.mutate()

  const handleNext = async () => {
    if (step === 'welcome') {
      setStep('profile')
      return
    }
    if (step === 'profile') {
      await saveProfile.mutateAsync(null)
      setStep('interests')
      return
    }
    if (step === 'interests') {
      if (selectedInterests.length) await saveInterests.mutateAsync()
      setStep('start')
      return
    }
    finish.mutate()
  }

  if (!open) return null

  const stepIndex = STEPS.indexOf(step)

  return (
    <Dialog open={open} onClose={() => {}} size="lg" className="motion-reduce:transition-none">
      <DialogTitle>
        {step === 'welcome' && 'Selamat datang di Projek Sains Data'}
        {step === 'profile' && 'Lengkapi profil Anda'}
        {step === 'interests' && 'Pilih minat Anda'}
        {step === 'start' && 'Mulai dari sini'}
      </DialogTitle>
      <DialogDescription>
        Langkah {stepIndex + 1} dari {STEPS.length} — Anda bisa melewati kapan saja.
      </DialogDescription>

      <DialogBody className="space-y-4">
        {step === 'welcome' && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            PSD adalah rumah bersama untuk belajar, berkolaborasi, dan berbagi aset sains data berbahasa Indonesia.
            Mari kenali Anda lebih dekat agar rekomendasi lebih relevan.
          </p>
        )}

        {step === 'profile' && (
          <div className="space-y-4">
            <Field>
              <Label>Foto profil (opsional)</Label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-sm text-neutral-600 file:me-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:text-neutral-400 dark:file:bg-neutral-800"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) saveProfile.mutate(file)
                }}
              />
            </Field>
            <Field>
              <Label>Bio singkat</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Ceritakan fokus riset atau minat Anda..."
                className="mt-1"
              />
            </Field>
          </div>
        )}

        {step === 'interests' && (
          <div>
            <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
              Pilih satu atau lebih domain yang ingin Anda eksplorasi.
            </p>
            <InterestChips value={selectedInterests} onChange={setSelectedInterests} />
          </div>
        )}

        {step === 'start' && (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Buat proyek', href: '/projects/new', desc: 'Mulai dari ide pertama' },
              { label: 'Jelajahi dataset', href: '/datasets', desc: 'Temukan data terbuka' },
              { label: 'Ikuti kompetisi', href: '/competitions', desc: 'Asah skill dengan tantangan' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <p className="font-medium text-neutral-900 dark:text-neutral-100">{item.label}</p>
                <p className="mt-1 text-xs text-neutral-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        )}
      </DialogBody>

      <DialogActions>
        <Button outline onClick={handleSkip} disabled={finish.isPending}>
          Lewati
        </Button>
        <ButtonPrimary
          onClick={handleNext}
          disabled={finish.isPending || saveProfile.isPending || saveInterests.isPending}
        >
          {step === 'start' ? 'Selesai' : 'Lanjut'}
        </ButtonPrimary>
      </DialogActions>
    </Dialog>
  )
}
