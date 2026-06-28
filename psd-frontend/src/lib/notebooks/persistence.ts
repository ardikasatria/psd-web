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

  return { schedule, flush }
}

export function createNotebookAutosave(notebookId: string, delayMs = 1200) {
  return createAutosave(async (ipynb) => {
    await saveNotebookContent(notebookId, ipynb)
  }, delayMs)
}
