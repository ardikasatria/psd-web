import type { NbOutput } from '@/lib/notebooks/editor/notebookModel'
import { KernelStatus, type KernelStatusValue, type NotebookKernel } from './kernelInterface'

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)
}

export function createServerKernel({
  wsBase,
  kernelId,
  token,
}: {
  wsBase: string
  kernelId: string
  token?: string
}): NotebookKernel {
  let status: KernelStatusValue = KernelStatus.STARTING
  const listeners = new Set<(s: KernelStatusValue) => void>()
  const setStatus = (s: KernelStatusValue) => {
    status = s
    listeners.forEach((cb) => cb(s))
  }

  const url = `${wsBase}/api/kernels/${kernelId}/channels?token=${encodeURIComponent(token || '')}`
  const ws = new WebSocket(url)
  const pending = new Map<string, { resolve: (v: { outputs: NbOutput[]; execution_count: number | null }) => void; outputs: NbOutput[]; count: number | null }>()

  ws.onopen = () => setStatus(KernelStatus.IDLE)
  ws.onclose = () => setStatus(KernelStatus.DEAD)
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data as string)
    const parentId = msg.parent_header?.msg_id as string | undefined
    const job = parentId ? pending.get(parentId) : undefined
    if (!job) return
    const t = msg.header.msg_type as string
    if (t === 'stream') {
      job.outputs.push({ output_type: 'stream', name: msg.content.name, text: msg.content.text })
    } else if (t === 'execute_result') {
      job.outputs.push({
        output_type: 'execute_result',
        data: msg.content.data,
        metadata: msg.content.metadata,
        execution_count: msg.content.execution_count,
      })
    } else if (t === 'display_data') {
      job.outputs.push({ output_type: 'display_data', data: msg.content.data, metadata: msg.content.metadata })
    } else if (t === 'error') {
      job.outputs.push({
        output_type: 'error',
        ename: msg.content.ename,
        evalue: msg.content.evalue,
        traceback: msg.content.traceback,
      })
    } else if (t === 'execute_reply') {
      job.count = msg.content.execution_count
    } else if (t === 'status' && msg.content.execution_state === 'idle') {
      job.resolve({ outputs: job.outputs, execution_count: job.count })
      pending.delete(parentId!)
      setStatus(KernelStatus.IDLE)
    }
  }

  return {
    get status() {
      return status
    },
    onStatus(cb) {
      listeners.add(cb)
      cb(status)
      return () => listeners.delete(cb)
    },
    execute(code) {
      setStatus(KernelStatus.BUSY)
      const msgId = uuid()
      const header = { msg_id: msgId, msg_type: 'execute_request', version: '5.3', username: 'psd', session: uuid() }
      const content = { code, silent: false, store_history: true, user_expressions: {}, allow_stdin: false }
      return new Promise((resolve) => {
        pending.set(msgId, { resolve: (v) => resolve({ outputs: v.outputs, execution_count: v.execution_count ?? 0 }), outputs: [], count: null })
        ws.send(JSON.stringify({ header, parent_header: {}, metadata: {}, content, channel: 'shell' }))
      })
    },
    async interrupt() {
      setStatus(KernelStatus.IDLE)
    },
    async restart() {
      setStatus(KernelStatus.IDLE)
    },
  }
}
