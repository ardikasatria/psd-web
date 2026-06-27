import Card10 from '@/components/PostCards/Card10'
import { getPostsAudio, getPostsDefault, getPostsGallery, getPostsVideo } from '@/data/posts'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Home page of the application showcasing various sections and posts.',
}

// this page for testing only
// this page for testing only
// this page for testing only
// TODO: remove this page

const Page = async () => {
  const posts = (await getPostsAudio()).slice(0, 2)
  const posts2 = (await getPostsVideo()).slice(0, 2)
  const posts3 = (await getPostsGallery()).slice(0, 2)
  const posts4 = (await getPostsDefault()).slice(0, 2)

  return (
    <div className="relative container space-y-28 pb-28 lg:space-y-32 lg:pb-32">
      <div className="grid grid-cols-1 gap-4 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {[...posts, ...posts2, ...posts3, ...posts4].map((post) => (
          <Card10 key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

export default Page
