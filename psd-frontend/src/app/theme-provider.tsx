'use client'

import { createContext, useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'psd-theme'

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  const legacy = localStorage.getItem('theme')
  if (legacy === 'dark-mode') return 'dark'
  if (legacy === 'light-mode') return 'light'
  return 'system'
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveDark(mode: ThemeMode) {
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return systemPrefersDark()
}

function applyToDocument(mode: ThemeMode) {
  const dark = resolveDark(mode)
  document.documentElement.classList.toggle('dark', dark)
  return dark
}

interface ThemeContextValue {
  themeMode: ThemeMode
  isDarkMode: boolean
  setThemeMode: (mode: ThemeMode) => void
  toggleDarkMode: () => void
  themeDir: 'rtl' | 'ltr'
  setThemeDir: (value: 'rtl' | 'ltr') => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [themeDir, setThemeDir] = useState<'rtl' | 'ltr'>('ltr')

  useEffect(() => {
    const mode = readStoredMode()
    setThemeModeState(mode)
    setIsDarkMode(applyToDocument(mode))
  }, [])

  useEffect(() => {
    if (themeMode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setIsDarkMode(applyToDocument('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [themeMode])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.getAttribute('dir') === 'rtl' ? setThemeDir('rtl') : setThemeDir('ltr')
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('dir', themeDir)
    }
  }, [themeDir])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    setIsDarkMode(applyToDocument(mode))
    localStorage.setItem(STORAGE_KEY, mode)
    localStorage.removeItem('theme')
  }, [])

  const toggleDarkMode = useCallback(() => {
    setThemeMode(isDarkMode ? 'light' : 'dark')
  }, [isDarkMode, setThemeMode])

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDarkMode,
        setThemeMode,
        toggleDarkMode,
        themeDir,
        setThemeDir,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
