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
import {
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

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
  className?: string
}

export function ContentOwnerMenu({
  visibility,
  onEdit,
  onDelete,
  onVisibilityChange,
  deletePending = false,
  visibilityPending = false,
  className,
}: ContentOwnerMenuProps) {
  return (
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
          onClick={onDelete}
          disabled={deletePending}
          className="!text-red-600 data-focus:!bg-red-50 dark:!text-red-400 dark:data-focus:!bg-red-950/40"
        >
          <TrashIcon data-slot="icon" className="size-4" />
          <span>{deletePending ? 'Menghapus...' : 'Hapus'}</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )
}
