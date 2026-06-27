import { AnalyticsDetailContent } from '@/components/features/analytics/AnalyticsDetailContent'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <AnalyticsDetailContent slug={slug} />
}
