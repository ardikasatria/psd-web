'use client'

import type { FactoryEngineLimits } from '@/types/api'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import Link from 'next/link'

function formatBytes(n?: number) {
  if (!n) return '—'
  if (n >= 1024 ** 3) return `≤${(n / 1024 ** 3).toFixed(0)} GB`
  if (n >= 1024 ** 2) return `≤${(n / 1024 ** 2).toFixed(0)} MB`
  return `≤${n} B`
}

type Props = {
  limits: FactoryEngineLimits | undefined
  engine: 'auto' | 'duckdb' | 'spark'
  onEngineChange: (e: 'auto' | 'duckdb' | 'spark') => void
  isLoading?: boolean
}

export function EngineSelector({ limits, engine, onEngineChange, isLoading }: Props) {
  const duck = limits?.engines?.duckdb
  const spark = limits?.engines?.spark
  const suggested = limits?.suggested_engine

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Pilih engine
        </p>
        <Link
          href="/factory/panduan"
          className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Panduan lengkap →
        </Link>
      </div>

      {limits?.estimated_bytes != null && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          Estimasi data ~{formatBytes(limits.estimated_bytes)}
          {suggested && engine === 'auto' && (
            <span className="ms-1 font-medium text-amber-700 dark:text-amber-300">
              → Auto memilih {suggested === 'spark' ? 'Spark' : 'DuckDB'}
            </span>
          )}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onEngineChange('auto')}
          className={clsx(
            'rounded-2xl border p-3 text-left transition',
            engine === 'auto'
              ? 'border-primary-400 bg-primary-50/80 ring-2 ring-primary-300/50 dark:border-primary-700 dark:bg-primary-950/40'
              : 'border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800',
          )}
        >
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Auto</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Sistem pilih dari ukuran data</p>
        </button>

        <button
          type="button"
          disabled={isLoading || duck?.allowed === false}
          onClick={() => onEngineChange('duckdb')}
          className={clsx(
            'rounded-2xl border p-3 text-left transition',
            engine === 'duckdb'
              ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-300/50 dark:border-amber-800 dark:bg-amber-950/30'
              : 'border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800',
            duck?.allowed === false && 'cursor-not-allowed opacity-60',
          )}
        >
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">DuckDB (SQL)</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Cepat & interaktif</p>
          {duck && (
            <p className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400">
              {formatBytes(duck.max_bytes)} · {duck.max_runs_per_day} run/hari
              {duck.raw_sql && ' · Node SQL'}
            </p>
          )}
        </button>

        <button
          type="button"
          disabled={isLoading || spark?.allowed === false}
          onClick={() => onEngineChange('spark')}
          className={clsx(
            'relative rounded-2xl border p-3 text-left transition',
            engine === 'spark'
              ? 'border-violet-400 bg-violet-50/80 ring-2 ring-violet-300/50 dark:border-violet-800 dark:bg-violet-950/30'
              : 'border-neutral-200/80 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800',
            spark?.allowed === false && 'cursor-not-allowed opacity-60',
          )}
        >
          {spark?.allowed === false && (
            <LockClosedIcon className="absolute end-3 top-3 size-4 text-neutral-400" aria-hidden />
          )}
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Spark (PySpark)</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Data besar & terdistribusi</p>
          {spark?.allowed ? (
            <p className="mt-2 text-[10px] text-neutral-500 dark:text-neutral-400">
              {formatBytes(spark.max_bytes)} · {spark.max_runs_per_day} run/hari
              {spark.raw_code && ' · Node .py'}
            </p>
          ) : (
            <p className="mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-300">
              Terbuka di tier Menengah —{' '}
              <Link href="/leaderboard" className="underline">
                naik tier
              </Link>
            </p>
          )}
        </button>
      </div>
    </div>
  )
}

export function canUseSqlNode(limits?: FactoryEngineLimits) {
  return limits?.engines?.duckdb?.raw_sql || limits?.engines?.spark?.raw_sql
}

export function canUsePySparkNode(limits?: FactoryEngineLimits) {
  return limits?.engines?.spark?.raw_code === true
}
