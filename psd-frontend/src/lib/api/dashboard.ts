import { useQuery } from '@tanstack/react-query'
import { getMe } from './auth'
import { getUser, getPortfolio } from './users'
import { getCompetitions } from './competitions'
import { getEvents } from './events'
import { getThreads } from './community'
import { getCourses, getMyLearning } from './learn'
import { getRepos } from './repos'
import { getMyEvents, getMySubmissions, getMyThreads } from './me'

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: getMe })

export const useActiveCompetitions = () =>
  useQuery({
    queryKey: ['dash', 'comp'],
    queryFn: () => getCompetitions({ status: 'active', page_size: 3 }),
  })

export const useUpcomingEvents = () =>
  useQuery({
    queryKey: ['dash', 'events'],
    queryFn: () => getEvents({ status: 'upcoming', page_size: 3 }),
  })

export const useMyPortfolio = (username?: string) =>
  useQuery({
    enabled: !!username,
    queryKey: ['dash', 'portfolio', username],
    queryFn: () => getPortfolio(username!, { page_size: 4 }),
  })

export const useMyThreads = () =>
  useQuery({
    queryKey: ['my-threads'],
    queryFn: () => getMyThreads({ page_size: 5 }),
  })

export const useRecentThreads = () =>
  useQuery({
    queryKey: ['dash', 'threads'],
    queryFn: () => getThreads({ page_size: 5 }),
  })

export const useMyLearning = () =>
  useQuery({
    queryKey: ['my-learning'],
    queryFn: async () => {
      const data = await getMyLearning()
      return { items: data.items, total: data.items.length }
    },
  })

export const useRecommendedCourses = () =>
  useQuery({
    queryKey: ['dash', 'courses'],
    queryFn: () => getCourses({ page_size: 3 }),
  })

export const useExploreDatasets = () =>
  useQuery({
    queryKey: ['dash', 'datasets'],
    queryFn: () => getRepos('dataset', { page_size: 4 }),
  })

export const useMyAssetCount = (username?: string) =>
  useQuery({
    enabled: !!username,
    queryKey: ['dash', 'asset-count', username],
    queryFn: async () => {
      const profile = await getUser(username!)
      const { projects, datasets, models } = profile.stats
      return projects + datasets + models
    },
  })

export const useMySubmissions = () =>
  useQuery({
    queryKey: ['dash', 'my-subs'],
    queryFn: () => getMySubmissions({ page_size: 4 }),
  })

export const useMyEvents = () =>
  useQuery({
    queryKey: ['dash', 'my-events'],
    queryFn: () => getMyEvents({ page_size: 4 }),
  })
