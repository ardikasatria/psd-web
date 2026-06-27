'use client'

import Skeleton from '@/components/Skeleton'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/shared/dialog'
import { Button } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import { Table } from '@/shared/table'
import clsx from 'clsx'
import { useState, type ComponentProps } from 'react'

interface ConfirmDialogProps {
  label: string
  confirm: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  disabled?: boolean
}

export function ConfirmDialog({ label, confirm, danger, onConfirm, disabled }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button type="button" outline onClick={() => setOpen(true)} disabled={disabled} className={danger ? '!text-red-600' : undefined}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="sm">
        <DialogTitle>Konfirmasi</DialogTitle>
        <DialogDescription>{confirm}</DialogDescription>
        <DialogBody />
        <DialogActions>
          <Button outline onClick={() => setOpen(false)}>
            Batal
          </Button>
          <ButtonPrimary onClick={handleConfirm} disabled={busy} className={danger ? '!bg-red-600' : undefined}>
            {busy ? 'Memproses...' : 'Ya, lanjutkan'}
          </ButtonPrimary>
        </DialogActions>
      </Dialog>
    </>
  )
}

export function AdminPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-10 w-64 rounded-lg" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}

interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-neutral-900 sm:text-3xl dark:text-neutral-100">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function AdminContentCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl border border-neutral-200 bg-white [--gutter:--spacing(6)] dark:border-neutral-700 dark:bg-neutral-800',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AdminTableToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 border-b border-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AdminTable({ children, className, ...props }: ComponentProps<typeof Table>) {
  return (
    <div className="px-6 pt-4 pb-2">
      <Table
        bleed
        className={clsx(
          '[&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-neutral-500 [&_th]:uppercase dark:[&_th]:text-neutral-400',
          className,
        )}
        {...props}
      >
        {children}
      </Table>
    </div>
  )
}

export function AdminTableFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 border-t border-neutral-200 px-6 py-4 text-sm text-neutral-600 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-700 dark:text-neutral-400',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function AdminTableEmpty({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-10 text-center text-sm text-neutral-500">{children}</p>
}
