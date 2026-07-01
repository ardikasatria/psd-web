'use client'

import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
} from '@/shared/dropdown'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Dialog, DialogActions, DialogDescription, DialogTitle } from '@/shared/dialog'
import {
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { useState } from 'react'

export type ContentVisibility = 'public' | 'private'

const selectedOptionClass =
  'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-950/30 dark:text-primary-300'

type ContentOwnerMenuProps = {
  visibility: ContentVisibility
  onEdit: () => void
  onDelete: () => void
  onVisibilityChange: (visibility: ContentVisibility) => void
  deletePending?: boolean
  visibilityPending?: boolean
  deleteConfirmTitle?: string
  deleteConfirmDescription?: string
  className?: string
}

export function ContentOwnerMenu({
  visibility,
  onEdit,
  onDelete,
  onVisibilityChange,
  deletePending = false,
  visibilityPending = false,
  deleteConfirmTitle = 'Hapus konten?',
  deleteConfirmDescription = 'Konten ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.',
  className,
}: ContentOwnerMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleConfirmDelete = () => {
    onDelete()
    setConfirmOpen(false)
  }

  return (
    <>
      <Dropdown>
        <DropdownButton
          as={Button}
          plain
          className={clsx('!text-neutral-400 hover:!text-neutral-600 dark:hover:!text-neutral-300', className)}
          aria-label="Kelola konten"
        >
          <EllipsisVerticalIcon className="size-5" />
        </DropdownButton>
        <DropdownMenu anchor="bottom end" className="min-w-44">
          <DropdownItem onClick={onEdit}>
            <PencilSquareIcon data-slot="icon" className="size-4" />
            <span>Edit</span>
          </DropdownItem>
          <DropdownDivider />
          <DropdownSection>
            <DropdownItem
              onClick={() => onVisibilityChange('public')}
              disabled={visibilityPending}
              className={clsx(visibility === 'public' && selectedOptionClass)}
            >
              <EyeIcon data-slot="icon" className="size-4" />
              <span>Publik</span>
            </DropdownItem>
            <DropdownItem
              onClick={() => onVisibilityChange('private')}
              disabled={visibilityPending}
              className={clsx(visibility === 'private' && selectedOptionClass)}
            >
              <EyeSlashIcon data-slot="icon" className="size-4" />
              <span>Hanya saya</span>
            </DropdownItem>
          </DropdownSection>
          <DropdownDivider />
          <DropdownItem
            onClick={() => setConfirmOpen(true)}
            disabled={deletePending}
            className="!text-red-600 data-focus:!bg-red-50 dark:!text-red-400 dark:data-focus:!bg-red-950/40"
          >
            <TrashIcon data-slot="icon" className="size-4" />
            <span>Hapus</span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} size="sm">
        <DialogTitle>{deleteConfirmTitle}</DialogTitle>
        <DialogDescription>{deleteConfirmDescription}</DialogDescription>
        <DialogActions>
          <Button outline onClick={() => setConfirmOpen(false)} disabled={deletePending}>
            Batal
          </Button>
          <ButtonPrimary
            onClick={handleConfirmDelete}
            disabled={deletePending}
            className="!bg-red-600 hover:!bg-red-700"
          >
            {deletePending ? 'Menghapus...' : 'Ya, hapus'}
          </ButtonPrimary>
        </DialogActions>
      </Dialog>
    </>
  )
}
