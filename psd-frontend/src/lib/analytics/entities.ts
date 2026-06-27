import type {
  CompetitionSummary,
  CourseSummary,
  EventSummary,
  NotebookSummary,
  RepoSummary,
} from '@/types/api'
import { trackClick } from './track'

function cardMeta(item: { category?: { slug: string } | null; tags?: string[] }) {
  return {
    category_slug: item.category?.slug,
    tags: item.tags,
  }
}

export function trackRepoClick(repo: RepoSummary) {
  trackClick('repo', repo.id, { ...cardMeta(repo), tags: repo.tags })
}

export function trackCourseClick(course: CourseSummary) {
  trackClick('course', course.slug, cardMeta(course))
}

export function trackCompetitionClick(competition: CompetitionSummary) {
  trackClick('competition', competition.slug, cardMeta(competition))
}

export function trackEventClick(event: EventSummary) {
  trackClick('event', event.slug, cardMeta(event))
}

export function trackNotebookClick(notebook: NotebookSummary) {
  trackClick('notebook', notebook.id, cardMeta(notebook))
}

export function trackCategoryClick(slug: string) {
  trackClick('category', slug, { category_slug: slug })
}
