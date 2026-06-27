import SectionAds from '@/components/SectionAds'
import SectionBecomeAnAuthor from '@/components/SectionBecomeAnAuthor'
import SectionMagazine10 from '@/components/SectionMagazine10'
import SectionMagazine11 from '@/components/SectionMagazine11'
import SectionMagazine2 from '@/components/SectionMagazine2'
import SectionMagazine9 from '@/components/SectionMagazine9'
import SectionPostsWithWidgets from '@/components/SectionPostsWithWidgets'
import { getAuthors } from '@/data/authors'
import { getCategoriesWithPosts } from '@/data/categories'
import { getAllPosts } from '@/data/posts'
import { Divider } from '@/shared/divider'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Home',
  description: 'Home page of the application showcasing various sections and posts.',
}

const Page = async () => {
  const posts = await getAllPosts()
  const authors = await getAuthors()
  const categories = await getCategoriesWithPosts()

  return (
    <div className="relative container space-y-28 pb-28 lg:space-y-32 lg:pb-32">
      <SectionMagazine10 posts={posts.slice(0, 8)} />

      <SectionMagazine9
        heading="Latest articles"
        subHeading="Explore the most popular categories"
        posts={posts.slice(0, 18)}
      />

      <SectionAds />

      <SectionMagazine2 heading="Latest articles" subHeading="Explore the newest articles" posts={posts.slice(0, 7)} />

      <Divider />

      <SectionMagazine11
        categories={categories.slice(0, 3)}
        heading="Editor's picks"
        subHeading="Explore the most popular categories"
      />

      <SectionBecomeAnAuthor />

      <SectionPostsWithWidgets
        heading="Latest articles"
        subHeading="Explore the most popular categories"
        posts={posts.slice(0, 8)}
        postCardName="card4"
        gridClass="sm:grid-cols-2"
        widgetAuthors={authors.slice(0, 4)}
        widgetCategories={categories.slice(0, 7)}
        widgetTags={categories.slice(0, 6)}
        widgetPosts={posts.slice(0, 4)}
      />
    </div>
  )
}

export default Page
