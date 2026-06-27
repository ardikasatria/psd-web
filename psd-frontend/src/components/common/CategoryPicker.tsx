'use client'

import { addSubcategory, getCategories, getCategory } from '@/lib/api/categories'
import { ApiError } from '@/lib/api/client'
import type { Category, Subcategory } from '@/types/api'
import { Field, Label } from '@/shared/fieldset'
import Input from '@/shared/Input'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'

type Props = {
  categorySlug: string | null
  subcategorySlug: string | null
  onChange: (category: string | null, subcategory: string | null) => void
  disabled?: boolean
}

export function CategoryPicker({ categorySlug, subcategorySlug, onChange, disabled }: Props) {
  const qc = useQueryClient()
  const [newSubName, setNewSubName] = useState('')
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [showAddInput, setShowAddInput] = useState(false)

  const mains = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const detail = useQuery({
    queryKey: ['category', categorySlug],
    queryFn: () => getCategory(categorySlug!),
    enabled: !!categorySlug,
  })

  useEffect(() => {
    setNotice(null)
    setShowAddInput(false)
    setNewSubName('')
  }, [categorySlug])

  const subs = detail.data?.subcategories ?? []

  const selectMain = (slug: string) => {
    if (disabled) return
    if (slug === categorySlug) return
    onChange(slug, null)
  }

  const selectSub = (slug: string) => {
    if (disabled || !categorySlug) return
    onChange(categorySlug, subcategorySlug === slug ? null : slug)
  }

  const handleAddSub = async () => {
    const name = newSubName.trim()
    if (!name || !categorySlug) return
    setAdding(true)
    setNotice(null)
    try {
      const created = await addSubcategory(categorySlug, name)
      await qc.invalidateQueries({ queryKey: ['category', categorySlug] })
      await qc.invalidateQueries({ queryKey: ['categories'] })
      onChange(categorySlug, created.slug)
      setNewSubName('')
      setShowAddInput(false)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'subcategory_exists') {
        const existing = subs.find((s: Subcategory) => s.name.toLowerCase() === name.toLowerCase())
        if (existing) {
          onChange(categorySlug, existing.slug)
        }
        setNotice('Subkategori sudah ada — memilih yang tersedia.')
      } else {
        setNotice(e instanceof Error ? e.message : 'Gagal menambah subkategori.')
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <Field>
        <Label>Kategori utama</Label>
        {mains.isLoading ? (
          <p className="text-sm text-neutral-500">Memuat kategori…</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {(mains.data ?? []).map((cat: Category) => (
              <button
                key={cat.slug}
                type="button"
                disabled={disabled}
                onClick={() => selectMain(cat.slug)}
                className={clsx(
                  'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all',
                  categorySlug === cat.slug
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:border-primary-300 hover:bg-primary-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-primary-700',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-xs text-neutral-500">
          Kategori utama dikelola staf. Pilih satu yang paling sesuai dengan aset Anda.
        </p>
      </Field>

      {categorySlug && (
        <Field>
          <Label>Subkategori</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {detail.isLoading ? (
              <p className="text-sm text-neutral-500">Memuat subkategori…</p>
            ) : (
              <>
                {subs.map((sub: Subcategory) => (
                  <button
                    key={sub.slug}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectSub(sub.slug)}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-all',
                      subcategorySlug === sub.slug
                        ? 'border-primary-500 bg-primary-50 text-primary-800 ring-2 ring-primary-200 dark:bg-primary-950/40 dark:text-primary-200 dark:ring-primary-800'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary-300 hover:bg-primary-50/60 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
                    )}
                  >
                    <span className="text-primary-500">#</span>
                    {sub.name}
                  </button>
                ))}
                {!showAddInput ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setShowAddInput(true)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary-300 px-3 py-1 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-950/30"
                  >
                    <PlusIcon className="size-4" />
                    Tambah subkategori
                  </button>
                ) : (
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <Input
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSub()
                        }
                        if (e.key === 'Escape') {
                          setShowAddInput(false)
                          setNewSubName('')
                        }
                      }}
                      placeholder="Nama subkategori baru"
                      className="!min-w-[12rem] !rounded-full !text-sm"
                      autoFocus
                      disabled={adding || disabled}
                    />
                    <button
                      type="button"
                      disabled={adding || !newSubName.trim() || disabled}
                      onClick={handleAddSub}
                      className="rounded-full bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      {adding ? '…' : 'Simpan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddInput(false)
                        setNewSubName('')
                      }}
                      className="text-sm text-neutral-500 hover:text-neutral-700"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            Subkategori seperti tag di media sosial, tetapi terikat pada kategori utama dan harus unik di dalamnya.
          </p>
          {notice && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {notice}
            </p>
          )}
        </Field>
      )}
    </div>
  )
}
