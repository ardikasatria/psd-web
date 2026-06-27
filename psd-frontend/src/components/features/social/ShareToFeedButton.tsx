'use client'

import { PostComposer } from '@/components/features/social/PostComposer'
import { Dialog, DialogBody, DialogTitle } from '@/shared/dialog'
import { ShareIcon } from '@heroicons/react/24/outline'
import { Button } from '@/shared/Button'
import { useState } from 'react'

export function ShareToFeedButton({
  kind,
  slug,
  className,
}: {
  kind: string
  slug: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button outline onClick={() => setOpen(true)} className={className}>
        <ShareIcon className="size-4" data-slot="icon" aria-hidden />
        Bagikan ke feed
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="lg">
        <DialogTitle>Bagikan ke feed</DialogTitle>
        <DialogBody>
          <p className="text-sm text-neutral-500">
            Bagikan aset ini ke feed komunitas agar pengikut Anda melihat update Anda.
          </p>
          <PostComposer
            initialAsset={{ kind, slug }}
            className="mt-4 !border-0 !p-0 !shadow-none"
            onPosted={() => setOpen(false)}
          />
        </DialogBody>
      </Dialog>
    </>
  )
}
