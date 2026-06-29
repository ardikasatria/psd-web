import { buildTree } from '@/lib/asset/buildTree'
import { cardSummary, parseFrontMatter } from '@/lib/asset/parseFrontMatter'
import { detectLanguageFromName } from '@/lib/asset/detectLanguage'
import { isValidBranchName } from '@/lib/asset/branchName'
import { detailOf, findRepo } from './repos'
import type { AssetBranch, AssetContributor, AssetVersion } from '@/types/api'

const branchesStore = new Map<string, AssetBranch[]>()
const versionsStore = new Map<string, AssetVersion[]>()

const MOCK_FILES: Record<string, Record<string, string>> = {
  'psd/ulasan-marketplace-id': {
    'README.md': `---
license: cc-by-sa-4.0
tags:
  - nlp
  - sentimen
language: id
---
# Ulasan Marketplace Indonesia

Dataset berisi ulasan produk berbahasa Indonesia.`,
    'src/preprocess.py': `import pandas as pd

def load_reviews(path: str) -> pd.DataFrame:
    return pd.read_csv(path)

if __name__ == "__main__":
    df = load_reviews("data/train.csv")
    print(len(df), "baris")`,
    'data/train.csv': 'text,label\nProduk bagus,2\nKurang puas,0',
  },
  'psd/indobert-sentimen': {
    'README.md': `---
license: mit
tags:
  - transformer
  - sentimen
language: id
library_name: transformers
---
# IndoBERT Sentimen

Model fine-tuned untuk klasifikasi sentimen.`,
    'train.py': 'from transformers import AutoModel\n\nprint("training...")',
    'config.json': '{\n  "architectures": ["BertForSequenceClassification"]\n}',
  },
}

function key(kind: string, owner: string, name: string) {
  return `${kind}:${owner}/${name}`
}

function pathsFor(slug: string, fallback: string[]) {
  const mock = MOCK_FILES[slug]
  if (mock) return Object.keys(mock)
  return fallback.length ? fallback : ['README.md']
}

export function mockAssetReadme(kind: string, owner: string, name: string) {
  const repo = findRepo(kind, owner, name)
  if (!repo) throw new Error('not_found')
  const detail = detailOf(repo)
  const raw = MOCK_FILES[repo.slug]?.['README.md'] ?? detail.readme_md
  const { meta, body } = parseFrontMatter(raw)
  return { meta, body_md: body, card: cardSummary(meta) }
}

export function mockAssetTree(kind: string, owner: string, name: string) {
  const repo = findRepo(kind, owner, name)
  if (!repo) throw new Error('not_found')
  const mockPaths = Object.keys(MOCK_FILES[repo.slug] ?? {})
  const paths =
    mockPaths.length > 0 ? mockPaths : ['README.md', ...detailOf(repo).files.map((f) => f.path)]
  return { tree: buildTree(paths), default_branch: 'main' }
}

export function mockAssetFile(kind: string, owner: string, name: string, path: string) {
  const repo = findRepo(kind, owner, name)
  if (!repo) throw new Error('not_found')
  const lang = detectLanguageFromName(path)
  const mock = MOCK_FILES[repo.slug]?.[path]
  if (lang === 'binary') {
    return {
      path,
      language: 'binary',
      is_binary: true,
      download_url: `https://example.com/mock/${repo.slug}/${path}`,
      size_bytes: 1024,
    }
  }
  const content =
    mock ??
    (path.endsWith('.md')
      ? detailOf(repo).readme_md
      : `# ${path}\n\nKonten mock untuk ${repo.name}.`)
  return {
    path,
    content,
    language: lang,
    is_binary: false,
    download_url: `https://example.com/mock/${repo.slug}/${path}`,
    size_bytes: content.length,
  }
}

export function mockAssetBranches(kind: string, owner: string, name: string) {
  const k = key(kind, owner, name)
  if (!branchesStore.has(k)) {
    branchesStore.set(k, [
      { name: 'main', commit_sha: 'abc123', is_default: true },
      { name: 'dev', commit_sha: 'def456' },
      { name: 'feature/preprocessing', commit_sha: 'ghi789' },
    ])
  }
  return branchesStore.get(k)!
}

export function mockCreateBranch(kind: string, owner: string, name: string, branchName: string, from: string) {
  if (!isValidBranchName(branchName)) throw new Error('invalid_branch')
  const list = mockAssetBranches(kind, owner, name)
  if (list.some((b) => b.name === branchName)) throw new Error('exists')
  const row = { name: branchName, commit_sha: 'new000', is_default: false }
  list.push(row)
  return row
}

export function mockAssetVersions(kind: string, owner: string, name: string) {
  const k = key(kind, owner, name)
  if (!versionsStore.has(k)) {
    versionsStore.set(k, [
      { tag: 'v1.2.0', name: 'Rilis stabil', created_at: '2025-05-01T00:00:00Z' },
      { tag: 'v1.0.0', name: 'Rilis awal', created_at: '2025-03-10T00:00:00Z' },
      { tag: 'v0.9.5', created_at: '2025-02-01T00:00:00Z' },
    ])
  }
  return versionsStore.get(k)!
}

export function mockAssetContributors(kind: string, owner: string, name: string) {
  const repo = findRepo(kind, owner, name)
  if (!repo) throw new Error('not_found')
  const rows: AssetContributor[] = [
    {
      username: repo.owner.username,
      commits: 24,
      avatar_url: repo.owner.avatar_url,
      is_team_member: false,
    },
    { username: 'budi-santoso', commits: 8, avatar_url: null, team: 'Riset AI', is_team_member: true },
    { username: 'siti-rahayu', commits: 3, avatar_url: null, is_team_member: false },
    { username: 'citra-ml', commits: 0, avatar_url: null, team: 'Riset AI', is_team_member: true },
  ]
  return rows.sort((a, b) => b.commits - a.commits)
}
