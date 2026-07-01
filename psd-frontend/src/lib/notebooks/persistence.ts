import { saveNotebookContent } from '@/lib/api/notebooks'
import type { IpyNb } from '@/lib/notebooks/ipynb'

export function createAutosave(saveFn: (ipynb: IpyNb) => Promise<void>, delayMs = 1200) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastPayload: IpyNb | null = null

  const flush = async () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (lastPayload != null) {
      const p = lastPayload
      lastPayload = null
      await saveFn(p)
    }
  }

  const schedule = (payload: IpyNb) => {
    lastPayload = payload
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  }

  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { schedule, flush, cancel }
}

const AUTOSAVE_PREF_KEY = 'psd:notebook-autosave'

export function readNotebookAutosavePref(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(AUTOSAVE_PREF_KEY) !== 'false'
}

export function writeNotebookAutosavePref(enabled: boolean) {
  localStorage.setItem(AUTOSAVE_PREF_KEY, enabled ? 'true' : 'false')
}

export function createNotebookAutosave(notebookId: string, delayMs = 1200) {
  return createAutosave(async (ipynb) => {
    await saveNotebookContent(notebookId, ipynb)
  }, delayMs)
}
