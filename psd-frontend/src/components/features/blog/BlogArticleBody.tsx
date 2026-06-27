'use client'

import clsx from 'clsx'

type BlogArticleBodyProps = {
  html: string
  className?: string
}

/** Render konten artikel (HTML dari TipTap) dengan tipografi Medium-like. */
export function BlogArticleBody({ html, className }: BlogArticleBodyProps) {
  if (!html?.trim()) {
    return <p className="text-neutral-500">Belum ada konten.</p>
  }

  const isHtml = html.trim().startsWith('<')

  if (!isHtml) {
    return (
      <div className={clsx('prose prose-lg mx-auto max-w-none dark:prose-invert', className)}>
        {html.split(/\n\n+/).map((block, i) => (
          <p key={i} className="text-neutral-700 dark:text-neutral-300">
            {block}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'prose prose-lg mx-auto max-w-none dark:prose-invert',
        'prose-headings:font-bold prose-headings:tracking-tight',
        'prose-p:leading-relaxed prose-a:text-primary-600 dark:prose-a:text-primary-400',
        'prose-img:rounded-xl prose-blockquote:border-primary-500',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
