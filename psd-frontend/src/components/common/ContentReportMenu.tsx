'use client'

import { ReportContentModal } from '@/components/common/ReportContentModal'
import { Button } from '@/shared/Button'
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
} from '@/shared/dropdown'
import type { ReportableKind } from '@/types/api'
import { EllipsisVerticalIcon, FlagIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useState } from 'react'

export function ContentReportMenu({
  kind,
  targetId,
  className,
}: {
  kind: ReportableKind
  targetId: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Dropdown>
        <DropdownButton
          as={Button}
          plain
          className={clsx('!text-neutral-400 hover:!text-neutral-600 dark:hover:!text-neutral-300', className)}
          aria-label="Opsi konten"
        >
          <EllipsisVerticalIcon className="size-5" />
        </DropdownButton>
        <DropdownMenu anchor="bottom end" className="min-w-40">
          <DropdownItem
            onClick={() => setOpen(true)}
          >
            <FlagIcon data-slot="icon" className="size-4" />
            <span>Laporkan</span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
      <ReportContentModal
        open={open}
        onClose={() => setOpen(false)}
        kind={kind}
        targetId={targetId}
      />
    </>
  )
}
