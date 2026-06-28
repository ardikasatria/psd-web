import type { ContributorRow, Quest, Tier } from '@/types/api'
import { TIER_LABELS } from '@/lib/gamification/config'

export type ReputationGoal = {
  kind: 'tier' | 'rank'
  label: string
  targetLabel: string
  current: number
  target: number
  gap: number
  achievable: boolean
}

export function pendingQuestReputation(quests: Quest[]): number {
  return quests
    .filter((q) => !q.claimed && (q.claimable || !q.complete))
    .reduce((sum, q) => sum + q.reward_reputation, 0)
}

export function incompleteQuests(quests: Quest[]): Quest[] {
  return quests.filter((q) => !q.complete && !q.claimed)
}

export function tierGoal(tier: Tier): ReputationGoal | null {
  if (tier.next_at == null) return null
  const gap = Math.max(0, tier.next_at - tier.reputation)
  if (gap === 0) return null
  const nextName = TIER_LABELS[Math.min(tier.level + 1, TIER_LABELS.length - 1)]
  return {
    kind: 'tier',
    label: 'Tier berikutnya',
    targetLabel: nextName,
    current: tier.reputation,
    target: tier.next_at,
    gap,
    achievable: false,
  }
}

export function rankGoal(
  reputation: number,
  rank: number | null,
  contributors: ContributorRow[],
): ReputationGoal | null {
  if (rank == null || rank <= 1) return null
  const above = contributors.find((c) => c.rank === rank - 1)
  if (!above) return null
  const gap = Math.max(0, above.reputation - reputation + 1)
  if (gap === 0) return null
  return {
    kind: 'rank',
    label: 'Naik 1 peringkat',
    targetLabel: `#${rank - 1}`,
    current: reputation,
    target: above.reputation + 1,
    gap,
    achievable: false,
  }
}

export function enrichGoalsWithQuests(goals: ReputationGoal[], questRep: number): ReputationGoal[] {
  return goals.map((g) => ({ ...g, achievable: questRep >= g.gap }))
}

export function findMyRank(contributors: ContributorRow[], username: string | undefined): number | null {
  if (!username) return null
  return contributors.find((c) => c.user.username === username)?.rank ?? null
}
