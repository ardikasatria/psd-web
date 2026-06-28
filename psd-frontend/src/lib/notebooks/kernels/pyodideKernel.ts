/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NbOutput } from '@/lib/notebooks/editor/notebookModel'
import { KernelStatus, type KernelStatusValue, type NotebookKernel } from './kernelInterface'

const PYODIDE_VERSION = '0.26.4'
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/pyodide@${PYODIDE_VERSION}/full/`

declare global {
  interface Window {
    loadPyodide?: (config?: { indexURL: string }) => Promise<any>
  }
}

async function ensurePyodideScript(): Promise<void> {
  if (window.loadPyodide) return
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-psd-pyodide]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Pyodide')))
      return
    }
    const script = document.createElement('script')
    script.src = `${PYODIDE_BASE}pyodide.js`
    script.async = true
    script.dataset.psdPyodide = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Gagal memuat Pyodide'))
    document.head.appendChild(script)
  })
}

export async function createPyodideKernel({
  apiBase = '',
  authToken = '',
  packages = [] as string[],
}: {
  apiBase?: string
  authToken?: string
  packages?: string[]
} = {}): Promise<NotebookKernel> {
  let status: KernelStatusValue = KernelStatus.STARTING
  const listeners = new Set<(s: KernelStatusValue) => void>()
  const setStatus = (s: KernelStatusValue) => {
    status = s
    listeners.forEach((cb) => cb(s))
  }

  await ensurePyodideScript()
  if (!window.loadPyodide) throw new Error('Pyodide tidak tersedia')
  const pyodide = await window.loadPyodide({ indexURL: PYODIDE_BASE })
  if (packages.length) await pyodide.loadPackage(packages)

  pyodide.globals.set('__PSD_API_BASE__', apiBase)
  pyodide.globals.set('__PSD_TOKEN__', authToken || '')

  let count = 0
  setStatus(KernelStatus.IDLE)

  return {
    get status() {
      return status
    },
    onStatus(cb) {
      listeners.add(cb)
      cb(status)
      return () => listeners.delete(cb)
    },
    async execute(code) {
      setStatus(KernelStatus.BUSY)
      const outputs: NbOutput[] = []
      pyodide.setStdout({ batched: (t: string) => outputs.push({ output_type: 'stream', name: 'stdout', text: t }) })
      pyodide.setStderr({ batched: (t: string) => outputs.push({ output_type: 'stream', name: 'stderr', text: t }) })
      try {
        await pyodide.loadPackagesFromImports(code, { messageCallback: () => {} })
        const result = await pyodide.runPythonAsync(code)
        if (result !== undefined) {
          outputs.push({
            output_type: 'execute_result',
            data: { 'text/plain': String(result) },
            metadata: {},
            execution_count: count + 1,
          })
        }
      } catch (err) {
        const e = err as Error
        outputs.push({
          output_type: 'error',
          ename: e?.name || 'Error',
          evalue: String(e?.message || err),
          traceback: [String(err)],
        })
      } finally {
        count += 1
        setStatus(KernelStatus.IDLE)
      }
      return { outputs, execution_count: count }
    },
    async interrupt() {
      setStatus(KernelStatus.IDLE)
    },
    async restart() {
      count = 0
      setStatus(KernelStatus.IDLE)
    },
  }
}
