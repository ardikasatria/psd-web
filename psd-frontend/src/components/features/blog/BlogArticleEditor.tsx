'use client'

import { EditorContent, EditorContext, useEditor } from '@tiptap/react'
import * as React from 'react'
import { Highlight } from '@tiptap/extension-highlight'
import { Image } from '@tiptap/extension-image'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import { Text } from '@tiptap/extension-text'
import { TextAlign } from '@tiptap/extension-text-align'
import { Typography } from '@tiptap/extension-typography'
import { Underline } from '@tiptap/extension-underline'
import { StarterKit } from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

import { Link } from '@/components/tiptap-extension/link-extension'
import { Selection } from '@/components/tiptap-extension/selection-extension'
import { TrailingNode } from '@/components/tiptap-extension/trailing-node-extension'
import { OnlyOneHeading, SingleHeadingDocument } from '@/components/tiptap-extension/single-heading-document'
import { SingleImageDocument } from '@/components/tiptap-extension/single-image-document'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { Spacer } from '@/components/tiptap-ui-primitive/spacer'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '@/components/tiptap-ui-primitive/toolbar'
import '@/components/tiptap-node/image-node/image-node.scss'
import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension'
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss'
import { BlockQuoteButton } from '@/components/tiptap-ui/blockquote-button'
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button'
import {
  ColorHighlightPopover,
  ColorHighlightPopoverButton,
  ColorHighlightPopoverContent,
} from '@/components/tiptap-ui/color-highlight-popover'
import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu'
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button'
import { LinkButton, LinkContent, LinkPopover } from '@/components/tiptap-ui/link-popover'
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu'
import { MarkButton } from '@/components/tiptap-ui/mark-button'
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button'
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button'
import { ArrowLeftIcon } from '@/components/tiptap-icons/arrow-left-icon'
import { HighlighterIcon } from '@/components/tiptap-icons/highlighter-icon'
import { LinkIcon } from '@/components/tiptap-icons/link-icon'
import { useMobile } from '@/hooks/use-mobile'
import { createBlogImageUpload, MAX_FILE_SIZE } from '@/lib/tiptap-utils'
import { createArticle, updateArticle, uploadBlogImage } from '@/lib/api/blog'
import { slugify } from '@/lib/utils/slug'
import type { BlogDetail } from '@/types/api'
import '@/components/tiptap-templates/simple/simple-editor.scss'
import '@/styles/_tiptap-keyframe-animations.scss'
import '@/styles/_tiptap-variables.scss'
import { Button as SharedButton } from '@/shared/Button'
import ButtonPrimary from '@/shared/ButtonPrimary'
import Input from '@/shared/Input'
import Logo from '@/shared/Logo'
import SwitchDarkMode from '@/shared/SwitchDarkMode'
import { TagsInput } from '@/shared/TagsInput'
import Textarea from '@/shared/Textarea'
import { useRouter } from 'next/navigation'

const TAG_SUGGESTIONS = [
  { id: 'platform', name: 'platform' },
  { id: 'umkm', name: 'umkm' },
  { id: 'nlp', name: 'nlp' },
  { id: 'dataset', name: 'dataset' },
  { id: 'lampung', name: 'lampung' },
  { id: 'riset', name: 'riset' },
  { id: 'komunitas', name: 'komunitas' },
  { id: 'edukasi', name: 'edukasi' },
]

const blogUpload = createBlogImageUpload(uploadBlogImage)

function MainToolbarContent({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) {
  return (
    <>
      <Spacer />
      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <HeadingDropdownMenu levels={[2, 3, 4]} />
        <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} />
        <BlockQuoteButton />
        <CodeBlockButton />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? <ColorHighlightPopover /> : <ColorHighlightPopoverButton onClick={onHighlighterClick} />}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ImageUploadButton text="Gambar" />
      </ToolbarGroup>
      <Spacer />
    </>
  )
}

const MobileToolbarContent = ({ type, onBack }: { type: 'highlighter' | 'link'; onBack: () => void }) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === 'highlighter' ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>
    <ToolbarSeparator />
    {type === 'highlighter' ? <ColorHighlightPopoverContent /> : <LinkContent />}
  </>
)

type BlogArticleEditorProps = {
  article?: BlogDetail
}

export function BlogArticleEditor({ article }: BlogArticleEditorProps) {
  const router = useRouter()
  const isNew = !article
  const isMobile = useMobile()
  const [mobileView, setMobileView] = React.useState<'main' | 'highlighter' | 'link'>('main')
  const toolbarRef = React.useRef<HTMLDivElement>(null)
  const [slug, setSlug] = React.useState(article?.slug ?? '')
  const [slugTouched, setSlugTouched] = React.useState(!!article)
  const [summary, setSummary] = React.useState(article?.summary ?? '')
  const [selectedTags, setSelectedTags] = React.useState(
    (article?.tags ?? []).map((t, i) => ({ id: String(i), name: t }))
  )
  const [featuredImageUrl, setFeaturedImageUrl] = React.useState(article?.cover_url ?? '')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: 'off',
        autocorrect: 'off',
        autocapitalize: 'off',
        'aria-label': 'Isi artikel',
        class: 'prose mx-auto max-w-screen-md dark:prose-invert lg:prose-lg',
      },
    },
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Placeholder.configure({
        placeholder: 'Tulis isi artikel...',
      }),
      ImageUploadNode.configure({
        accept: 'image/*',
        maxSize: MAX_FILE_SIZE,
        limit: 10,
        upload: blogUpload,
        onError: (err) => setError(err.message),
      }),
      TrailingNode,
      Link.configure({ openOnClick: false }),
    ],
    content: article?.body_md?.trim().startsWith('<') ? article.body_md : '<p></p>',
  })

  const featuredImageEditor = useEditor({
    immediatelyRender: false,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose mx-auto max-w-screen-md dark:prose-invert lg:prose-lg featuredImageEditor',
      },
    },
    extensions: [
      SingleImageDocument,
      StarterKit,
      Image,
      ImageUploadNode.configure({
        accept: 'image/*',
        maxSize: MAX_FILE_SIZE,
        limit: 1,
        upload: blogUpload,
        onSuccess: (url) => setFeaturedImageUrl(url),
        onError: () => setFeaturedImageUrl(''),
      }),
    ],
    content: article?.cover_url ? `<img src="${article.cover_url}" alt="" />` : '',
  })

  const titleEditor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose mx-auto max-w-screen-md dark:prose-invert lg:prose-lg titleEditor',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          return true
        }
        return false
      },
    },
    extensions: [
      SingleHeadingDocument,
      OnlyOneHeading.configure({ levels: [1] }),
      Placeholder.configure({ placeholder: 'Judul artikel...' }),
      Text,
    ],
    content: article?.title ? `<h1>${article.title}</h1>` : '<h1></h1>',
    onUpdate: ({ editor: ed }) => {
      const content = ed.getJSON()
      if (content.content && content.content.length > 1) {
        const text = content?.content?.[0]?.content?.[0]?.text ?? ''
        ed.commands.setContent(`<h1>${text}</h1>`)
      }
      if (!slugTouched) {
        const title = content?.content?.[0]?.content?.[0]?.text ?? ''
        setSlug(slugify(title))
      }
    },
  })

  const getTitle = () => {
    if (!titleEditor) return ''
    const content = titleEditor.getJSON()
    return content.content?.[0]?.content?.[0]?.text || ''
  }

  const buildPayload = () => {
    const tags = selectedTags.map((t) => t.name)
    return {
      title: getTitle(),
      summary,
      body_md: editor?.getHTML() ?? '',
      cover_url: featuredImageUrl || null,
      tags,
    }
  }

  const handleSave = async (publish = false) => {
    setError(null)
    const title = getTitle().trim()
    if (!title) {
      setError('Judul wajib diisi.')
      return
    }
    const finalSlug = slug.trim() || slugify(title)
    if (!finalSlug) {
      setError('Slug wajib diisi.')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      if (isNew) {
        const { slug: newSlug } = await createArticle({ slug: finalSlug, ...payload })
        if (publish) {
          await updateArticle(newSlug, { status: 'published' })
          router.push(`/blog/${newSlug}`)
        } else {
          router.replace(`/admin/blog/${newSlug}/edit`)
        }
      } else {
        await updateArticle(article!.slug, { ...payload, ...(publish ? { status: 'published' } : { status: 'draft' }) })
        if (publish) router.push(`/blog/${article!.slug}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  React.useEffect(() => {
    if (!isMobile && mobileView !== 'main') setMobileView('main')
  }, [isMobile, mobileView])

  return (
    <EditorContext.Provider value={{ editor }}>
      <div className="min-h-screen bg-white dark:bg-neutral-950">
        <div className="sticky top-0 z-10 flex h-[var(--tt-toolbar-height)] items-center gap-2 border-b border-neutral-200 bg-[var(--tt-toolbar-bg-color)] px-2 dark:border-neutral-800">
          <div className="flex items-center gap-1">
            <Button data-style="ghost" onClick={() => router.push('/admin/blog')}>
              <ArrowLeftIcon className="tiptap-button-icon" />
              <span className="text-nowrap">Keluar</span>
            </Button>
            <span className="me-2 hidden font-light text-neutral-500 sm:block dark:text-neutral-400">/</span>
            <Logo size="size-6" className="hidden! sm:block!" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <SharedButton outline disabled={saving} onClick={() => handleSave(false)}>
              {saving ? 'Menyimpan...' : 'Simpan draft'}
            </SharedButton>
            <ButtonPrimary disabled={saving} onClick={() => handleSave(true)}>
              Terbitkan
            </ButtonPrimary>
            <SwitchDarkMode iconSize="size-4.5" className="size-8!" />
          </div>
        </div>

        {error && (
          <p className="container mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="title-wrapper container mt-8 sm:mt-12">
          <div className="mx-auto max-w-screen-md">
            <ImageUploadButton
              className="h-10! ring-2 ring-neutral-200 dark:ring-neutral-600"
              text={featuredImageUrl ? 'Ganti cover' : 'Tambah cover'}
              editor={featuredImageEditor}
            />
          </div>
          <EditorContent editor={featuredImageEditor} role="presentation" />
          <EditorContent editor={titleEditor} role="presentation" />

          <div className="mx-auto mt-4 max-w-screen-md space-y-4 sm:mt-6">
            <Textarea
              placeholder="Ringkasan singkat (tampil di daftar artikel)..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="!rounded-xl"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-500">Slug URL</label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(e.target.value)
                  }}
                  placeholder="judul-artikel"
                  className="!rounded-lg font-mono text-sm"
                />
                <p className="mt-1 text-xs text-neutral-400">/blog/{slug || '...'}</p>
              </div>
            </div>
            <TagsInput
              value={selectedTags}
              suggestions={TAG_SUGGESTIONS}
              onChange={setSelectedTags}
              placeholder="Tambah tag..."
              maxTags={5}
              className="w-full"
            />
          </div>
        </div>

        <Toolbar ref={toolbarRef} className="my-8 sm:my-12">
          {mobileView === 'main' ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView('highlighter')}
              onLinkClick={() => setMobileView('link')}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === 'highlighter' ? 'highlighter' : 'link'}
              onBack={() => setMobileView('main')}
            />
          )}
        </Toolbar>

        <div className="content-wrapper container pb-20">
          <EditorContent editor={editor} role="presentation" className="simple-editor-content" />
        </div>
      </div>
    </EditorContext.Provider>
  )
}
