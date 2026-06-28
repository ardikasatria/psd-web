import type { NbOutput } from '@/lib/notebooks/editor/notebookModel'

export const KernelStatus = {
  STARTING: 'starting',
  IDLE: 'idle',
  BUSY: 'busy',
  DEAD: 'dead',
} as const

export type KernelStatusValue = (typeof KernelStatus)[keyof typeof KernelStatus]

export type KernelExecuteResult = {
  outputs: NbOutput[]
  execution_count: number
}

export type NotebookKernel = {
  readonly status: KernelStatusValue
  execute(code: string): Promise<KernelExecuteResult>
  interrupt(): Promise<void>
  restart(): Promise<void>
  onStatus(cb: (s: KernelStatusValue) => void): () => void
}

export function createMockKernel(): NotebookKernel {
  let status: KernelStatusValue = KernelStatus.IDLE
  let count = 0
  return {
    get status() {
      return status
    },
    async execute(code) {
      status = KernelStatus.BUSY
      await new Promise((r) => setTimeout(r, 120))
      count += 1
      status = KernelStatus.IDLE
      return {
        execution_count: count,
        outputs: [{ output_type: 'stream', name: 'stdout', text: `(mock) menjalankan ${code.length} karakter\n` }],
      }
    },
    async interrupt() {
      status = KernelStatus.IDLE
    },
    async restart() {
      count = 0
      status = KernelStatus.IDLE
    },
    onStatus() {
      return () => {}
    },
  }
}
