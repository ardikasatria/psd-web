import { z } from 'zod'
import { apiFetch, apiDelete } from './client'

export const GitInfoSchema = z.object({
  enabled: z.boolean(),
  git_host: z.string(),
  git_base_url: z.string(),
  ssh_user: z.string(),
  ssh_port: z.number(),
  gitea_username: z.string(),
  ssh_clone_prefix: z.string(),
  ssh_test_command: z.string(),
})
export type GitInfo = z.infer<typeof GitInfoSchema>

export const SshKeySchema = z.object({
  id: z.number(),
  title: z.string(),
  fingerprint: z.string(),
  key_type: z.string(),
  created_at: z.string().optional().nullable(),
})
export type SshKey = z.infer<typeof SshKeySchema>

export const getGitInfo = () => apiFetch('/me/git/info', GitInfoSchema)

export const listSshKeys = () =>
  apiFetch('/me/git/ssh-keys', z.object({ items: z.array(SshKeySchema) }))

export const addSshKey = (body: { title: string; key: string }) =>
  apiFetch('/me/git/ssh-keys', SshKeySchema, {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const deleteSshKey = (id: number) => apiDelete(`/me/git/ssh-keys/${id}`)
