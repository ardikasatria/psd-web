import type { NbOutput } from '@/lib/notebooks/editor/notebookModel'
import { KernelStatus, type KernelStatusValue, type NotebookKernel } from './kernelInterface'

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)
}

export type HubKernelConfig = {
  kernelsUrl: string
  wsBase: string
  token: string
}

async function hubFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`JupyterHub ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function ensureHubKernelId(cfg: HubKernelConfig): Promise<string> {
  const existing = (await hubFetch(cfg.kernelsUrl, cfg.token)) as { id: string }[]
  if (existing.length > 0) return existing[0].id
  const created = (await hubFetch(cfg.kernelsUrl, cfg.token, {
    method: 'POST',
    body: JSON.stringify({ name: 'python3' }),
  })) as { id: string }
  return created.id
}

export function createServerKernel({
  wsBase,
  kernelId,
  token,
  kernelsUrl,
}: {
  wsBase: string
  kernelId: string
  token?: string
  kernelsUrl?: string
}): NotebookKernel {
  let status: KernelStatusValue = KernelStatus.STARTING
  const listeners = new Set<(s: KernelStatusValue) => void>()
  const setStatus = (s: KernelStatusValue) => {
    status = s
    listeners.forEach((cb) => cb(s))
  }

  const authToken = token || ''
  const restBase = kernelsUrl || `${wsBase.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')}/api/kernels`
  const url = `${wsBase}/api/kernels/${kernelId}/channels?token=${encodeURIComponent(authToken)}`
  const ws = new WebSocket(url)
  const pending = new Map<
    string,
    {
      resolve: (v: { outputs: NbOutput[]; execution_count: number | null }) => void
      outputs: NbOutput[]
      count: number | null
    }
  >()

  ws.onopen = () => setStatus(KernelStatus.IDLE)
  ws.onclose = () => setStatus(KernelStatus.DEAD)
  ws.onerror = () => setStatus(KernelStatus.DEAD)
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
      if (ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('Kernel belum terhubung'))
      }
      setStatus(KernelStatus.BUSY)
      const msgId = uuid()
      const header = {
        msg_id: msgId,
        msg_type: 'execute_request',
        version: '5.3',
        username: 'psd',
        session: uuid(),
      }
      const content = { code, silent: false, store_history: true, user_expressions: {}, allow_stdin: false }
      return new Promise((resolve, reject) => {
        pending.set(msgId, {
          resolve: (v) => resolve({ outputs: v.outputs, execution_count: v.execution_count ?? 0 }),
          outputs: [],
          count: null,
        })
        try {
          ws.send(JSON.stringify({ header, parent_header: {}, metadata: {}, content, channel: 'shell' }))
        } catch (e) {
          pending.delete(msgId)
          reject(e)
        }
      })
    },
    async interrupt() {
      if (authToken) {
        await hubFetch(`${restBase}/${kernelId}/interrupt`, authToken, { method: 'POST' })
      }
      setStatus(KernelStatus.IDLE)
    },
    async restart() {
      if (authToken) {
        await hubFetch(`${restBase}/${kernelId}/restart`, authToken, { method: 'POST' })
      }
      setStatus(KernelStatus.IDLE)
    },
  }
}

export async function createHubServerKernel(cfg: HubKernelConfig): Promise<NotebookKernel> {
  const kernelId = await ensureHubKernelId(cfg)
  return createServerKernel({
    wsBase: cfg.wsBase,
    kernelId,
    token: cfg.token,
    kernelsUrl: cfg.kernelsUrl,
  })
}
