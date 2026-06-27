import type { QuestStep } from '@/types/api'

const STEP_LINKS: Record<string, (step: QuestStep) => string> = {
  complete_profile: () => '/settings/profile',
  complete_course: (s) => (s.target ? `/learn/${s.target}` : '/learn'),
  complete_path: (s) => (s.target ? `/learn/paths/${s.target}` : '/learn'),
  submit_competition: () => '/competitions',
  publish_asset: (s) => {
    if (s.target === 'dataset') return '/datasets/new'
    if (s.target === 'model') return '/models/new'
    return '/projects/new'
  },
  create_notebook: () => '/notebooks/new',
  make_post: () => '/community',
  make_thread: () => '/forum',
  reply_thread: () => '/forum',
  follow_user: () => '/explore',
  reach_reputation: () => '/me/gamification',
  enroll_course: (s) => (s.target ? `/learn/${s.target}` : '/learn'),
}

export function questStepHref(step: QuestStep): string {
  const fn = STEP_LINKS[step.type]
  return fn ? fn(step) : '/quests'
}

export const QUEST_STEP_LABELS: Record<string, string> = {
  complete_profile: 'Profil',
  complete_course: 'Belajar',
  complete_path: 'Learning path',
  submit_competition: 'Kompetisi',
  publish_asset: 'Aset',
  create_notebook: 'Notebook',
  make_post: 'Feed',
  make_thread: 'Forum',
  reply_thread: 'Balasan forum',
  follow_user: 'Ikuti',
  reach_reputation: 'Reputasi',
}
