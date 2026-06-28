'use client'

import type { NbOutput } from '@/lib/notebooks/editor/notebookModel'

function join(v: string | string[] | undefined) {
  return Array.isArray(v) ? v.join('') : (v ?? '')
}

function stripAnsi(s: string) {
  return String(s).replace(/\u001b\[[0-9;]*m/g, '')
}

function sanitizeHtml(html: string) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
}

function Output({ o }: { o: NbOutput }) {
  switch (o.output_type) {
    case 'stream':
      return (
        <pre className={`nb-out nb-stream ${o.name === 'stderr' ? 'is-err' : ''}`}>{join(o.text)}</pre>
      )
    case 'error':
      return (
        <pre className="nb-out nb-error">
          {o.ename}: {o.evalue}
          {'\n'}
          {stripAnsi(join(o.traceback))}
        </pre>
      )
    case 'execute_result':
    case 'display_data': {
      const data = o.data || {}
      if (data['image/png']) {
        return <img className="nb-out" alt="output" src={`data:image/png;base64,${data['image/png']}`} />
      }
      if (data['text/html']) {
        return (
          <div
            className="nb-out nb-html"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(join(data['text/html'])) }}
          />
        )
      }
      if (data['text/plain']) {
        return <pre className="nb-out">{join(data['text/plain'])}</pre>
      }
      return null
    }
    default:
      return null
  }
}

export function NotebookOutputs({ outputs }: { outputs?: NbOutput[] }) {
  if (!outputs?.length) return null
  return (
    <div className="nb-outputs">
      {outputs.map((o, i) => (
        <Output key={i} o={o} />
      ))}
    </div>
  )
}
