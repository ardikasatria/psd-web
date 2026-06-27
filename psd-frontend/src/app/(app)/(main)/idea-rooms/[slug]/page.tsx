import { RoomDetailContent } from '@/components/features/rooms/RoomDetailContent'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <RoomDetailContent slug={slug} />
}
