const EXT: Record<string, string> = {
  py: 'python',
  ipynb: 'json',
  js: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  md: 'markdown',
  mdx: 'markdown',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  sh: 'bash',
  bash: 'bash',
  sql: 'sql',
  r: 'r',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  html: 'html',
  css: 'css',
  ini: 'ini',
  cfg: 'ini',
  txt: 'text',
  csv: 'csv',
}

const BINARY = new Set([
  'parquet',
  'bin',
  'pt',
  'pth',
  'onnx',
  'safetensors',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'zip',
  'gz',
  'pkl',
  'h5',
  'npy',
  'npz',
])

export function detectLanguageFromName(filename = '') {
  const name = filename.split('/').pop()?.toLowerCase() ?? ''
  if (name === 'dockerfile') return 'dockerfile'
  if (!name.includes('.')) return 'text'
  const ext = name.split('.').pop() ?? ''
  if (BINARY.has(ext)) return 'binary'
  return EXT[ext] ?? 'text'
}
