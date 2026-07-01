import { describe, expect, it } from 'vitest'
import { canRunNotebook, canCollaborateOnAsset } from '@/lib/teams/collaboration'

const satria = { username: 'satria', role: 'member' }
const budi = { username: 'budi', role: 'member' }
const admin = { username: 'admin-psd', role: 'superadmin' }
const team = { slug: 'tim-ml', name: 'Tim ML' }

describe('notebook run access', () => {
  it('owner can run own notebook', () => {
    expect(canRunNotebook({ user: satria, ownerUsername: 'satria' })).toBe(true)
  })

  it('visitor cannot run others notebook', () => {
    expect(canRunNotebook({ user: satria, ownerUsername: 'budi' })).toBe(false)
  })

  it('staff can edit metadata but not run others notebook', () => {
    expect(
      canCollaborateOnAsset({ user: admin, ownerUsername: 'budi', isStaff: true }),
    ).toBe(true)
    expect(canRunNotebook({ user: admin, ownerUsername: 'budi' })).toBe(false)
  })

  it('team member can run team notebook', () => {
    expect(
      canRunNotebook({
        user: satria,
        ownerUsername: 'budi',
        team,
        myTeams: [{ slug: 'tim-ml', name: 'Tim ML', role: 'member' } as never],
      }),
    ).toBe(true)
  })
})
