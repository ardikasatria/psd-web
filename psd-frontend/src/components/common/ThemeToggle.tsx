'use client'

import { ThemeContext, type ThemeMode } from '@/app/theme-provider'
import { useAuth } from '@/lib/auth/useAuth'
import { updateSettings } from '@/lib/api/settings'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/shared/dropdown'
import {
  CheckIcon,
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
import { useQueryClient } from '@tanstack/react-query'
import type { Settings } from '@/types/api'
import clsx from 'clsx'
import { useCallback, useContext } from 'react'

const OPTIONS: { mode: ThemeMode; label: string; Icon: typeof SunIcon }[] = [
  { mode: 'light', label: 'Terang', Icon: SunIcon },
  { mode: 'dark', label: 'Gelap', Icon: MoonIcon },
  { mode: 'system', label: 'Sistem', Icon: ComputerDesktopIcon },
]

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useContext(ThemeContext)
  const { isLoggedIn } = useAuth()
  const qc = useQueryClient()

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      if (!theme) return
      theme.setThemeMode(mode)
      if (isLoggedIn) {
        const prev = qc.getQueryData<Settings>(['settings'])
        if (prev) {
          qc.setQueryData(['settings'], {
            ...prev,
            appearance: { ...prev.appearance, theme: mode },
          })
        }
        updateSettings({ appearance: { theme: mode } }).catch(() => {})
      }
    },
    [theme, isLoggedIn, qc],
  )

  if (!theme) return null

  const BtnIcon = theme.isDarkMode ? MoonIcon : SunIcon

  return (
    <Dropdown>
      <DropdownButton
        plain
        className={clsx(
          'rounded-full p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
          className,
        )}
        aria-label="Tema tampilan"
      >
        <BtnIcon className="size-5" aria-hidden />
      </DropdownButton>
      <DropdownMenu anchor="bottom end" className="min-w-36">
        {OPTIONS.map(({ mode, label, Icon }) => (
          <DropdownItem key={mode} onClick={() => setTheme(mode)} className="flex w-full items-center gap-2">
            <Icon className="size-4 shrink-0" data-slot="icon" />
            <span className="flex-1">{label}</span>
            {theme.themeMode === mode && <CheckIcon className="size-4 text-primary-600" />}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
