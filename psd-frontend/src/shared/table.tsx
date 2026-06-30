'use client'

import clsx from 'clsx'
import type React from 'react'
import { createContext, useContext, useState } from 'react'
import { Link } from './link'

const TableContext = createContext<{ bleed: boolean; dense: boolean; grid: boolean; striped: boolean; nowrap: boolean }>({
  bleed: false,
  dense: false,
  grid: false,
  striped: false,
  nowrap: false,
})

export function Table({
  bleed = false,
  dense = false,
  grid = false,
  striped = false,
  nowrap = false,
  className,
  children,
  ...props
}: { bleed?: boolean; dense?: boolean; grid?: boolean; striped?: boolean; nowrap?: boolean } & React.ComponentPropsWithoutRef<'div'>) {
  return (
    <TableContext.Provider value={{ bleed, dense, grid, striped, nowrap } as React.ContextType<typeof TableContext>}>
      <div className="flow-root">
        <div
          {...props}
          className={clsx(className, '-mx-(--gutter) overflow-x-auto', nowrap && 'whitespace-nowrap')}
        >
          <div className={clsx('align-middle', !bleed && 'sm:px-(--gutter)', nowrap ? 'inline-block min-w-full' : 'w-full')}>
            <table
              className={clsx(
                'text-left text-base/6 text-neutral-950 rtl:text-right dark:text-white',
                nowrap ? 'min-w-full' : 'w-full table-fixed',
              )}
            >
              {children}
            </table>
          </div>
        </div>
      </div>
    </TableContext.Provider>
  )
}

export function TableHead({ className, ...props }: React.ComponentPropsWithoutRef<'thead'>) {
  return <thead {...props} className={clsx(className, 'text-neutral-500 dark:text-neutral-400')} />
}

export function TableBody(props: React.ComponentPropsWithoutRef<'tbody'>) {
  return <tbody {...props} />
}

const TableRowContext = createContext<{ href?: string; target?: string; title?: string }>({
  href: undefined,
  target: undefined,
  title: undefined,
})

export function TableRow({
  href,
  target,
  title,
  className,
  ...props
}: { href?: string; target?: string; title?: string } & React.ComponentPropsWithoutRef<'tr'>) {
  let { striped } = useContext(TableContext)

  return (
    <TableRowContext.Provider value={{ href, target, title } as React.ContextType<typeof TableRowContext>}>
      <tr
        {...props}
        className={clsx(
          className,
          href &&
            'has-[[data-row-link][data-focus]]:outline-2 has-[[data-row-link][data-focus]]:-outline-offset-2 has-[[data-row-link][data-focus]]:outline-blue-500 dark:focus-within:bg-white/[2.5%]',
          striped && 'even:bg-neutral-950/[2.5%] dark:even:bg-white/[2.5%]',
          href && striped && 'hover:bg-neutral-950/5 dark:hover:bg-white/5',
          href && !striped && 'hover:bg-neutral-950/[2.5%] dark:hover:bg-white/[2.5%]'
        )}
      />
    </TableRowContext.Provider>
  )
}

export function TableHeader({
  className,
  nowrap: headerNowrap = false,
  ...props
}: { nowrap?: boolean } & React.ComponentPropsWithoutRef<'th'>) {
  let { bleed, grid, nowrap: tableNowrap } = useContext(TableContext)

  return (
    <th
      {...props}
      className={clsx(
        className,
        'border-b border-b-neutral-950/10 px-4 py-2 font-medium first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2)) dark:border-b-white/10',
        grid && 'border-l border-l-neutral-950/5 first:border-l-0 dark:border-l-white/5',
        !bleed && 'sm:first:pl-1 sm:last:pr-1',
        !tableNowrap && 'align-top',
        (headerNowrap || tableNowrap) && 'whitespace-nowrap',
      )}
    />
  )
}

export function TableCell({
  className,
  children,
  nowrap: cellNowrap = false,
  ...props
}: { nowrap?: boolean } & React.ComponentPropsWithoutRef<'td'>) {
  let { bleed, dense, grid, striped, nowrap: tableNowrap } = useContext(TableContext)
  let { href, target, title } = useContext(TableRowContext)
  let [cellRef, setCellRef] = useState<HTMLElement | null>(null)

  return (
    <td
      ref={href ? setCellRef : undefined}
      {...props}
      className={clsx(
        className,
        'relative px-4 first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2))',
        !striped && 'border-b border-neutral-950/5 dark:border-white/5',
        grid && 'border-l border-l-neutral-950/5 first:border-l-0 dark:border-l-white/5',
        dense ? 'py-2.5' : 'py-4',
        !bleed && 'sm:first:pl-1 sm:last:pr-1',
        (cellNowrap || tableNowrap) && 'whitespace-nowrap',
        !cellNowrap && !tableNowrap && 'align-top break-words whitespace-normal [overflow-wrap:anywhere]',
      )}
    >
      {href && (
        <Link
          data-row-link
          href={href}
          target={target}
          aria-label={title}
          tabIndex={cellRef?.previousElementSibling === null ? 0 : -1}
          className="absolute inset-0 focus:outline-hidden"
        />
      )}
      {children}
    </td>
  )
}
