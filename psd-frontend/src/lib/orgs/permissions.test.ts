import { describe, expect, it } from 'vitest'
import { orgCan, canSetOrgRole } from './permissions'
import {
  canPostOpportunity,
  isLastOwner,
  resolveAssetLevel,
  validateHandle,
} from './org-utils'

describe('org permissions', () => {
  it('owner has billing and delete', () => {
    expect(orgCan('owner', 'manage_billing')).toBe(true)
    expect(orgCan('admin', 'manage_billing')).toBe(false)
  })

  it('admin cannot set admin role', () => {
    expect(canSetOrgRole('admin', 'member', 'billing_manager')).toBe(true)
    expect(canSetOrgRole('admin', 'member', 'admin')).toBe(false)
  })

  it('member can post announcements', () => {
    expect(orgCan('member', 'post_announcement')).toBe(true)
    expect(orgCan('member', 'manage_members')).toBe(false)
    expect(orgCan('billing_manager', 'post_announcement')).toBe(false)
  })

  it('owner and admin inherit announcement posting', () => {
    expect(orgCan('owner', 'post_announcement')).toBe(true)
    expect(orgCan('admin', 'post_announcement')).toBe(true)
  })

  it('member is view only for management', () => {
    expect(orgCan('member', 'view_org')).toBe(true)
    expect(orgCan('member', 'manage_members')).toBe(false)
  })
})

describe('org utils', () => {
  it('validates handle', () => {
    expect(validateHandle('umkm-batik')).toBeNull()
    expect(validateHandle('ab')).not.toBeNull()
    expect(validateHandle('settings')).not.toBeNull()
  })

  it('protects last owner', () => {
    const members = [
      { user_id: 'o1', role: 'owner' },
      { user_id: 'm1', role: 'member' },
    ]
    expect(isLastOwner(members, 'o1')).toBe(true)
    expect(isLastOwner(members, 'm1')).toBe(false)
  })

  it('resolves asset level as max', () => {
    expect(
      resolveAssetLevel({ role: 'member', orgBase: 'read', teamLevels: ['write'] }),
    ).toBe('write')
    expect(resolveAssetLevel({ role: 'owner' })).toBe('admin')
  })

  it('gates opportunities on verification', () => {
    expect(canPostOpportunity('umkm', 'verified')).toBe(true)
    expect(canPostOpportunity('umkm', 'unverified')).toBe(false)
    expect(canPostOpportunity('community', 'verified')).toBe(false)
  })
})
