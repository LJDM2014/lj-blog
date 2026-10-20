import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeShikiFromHighlighter from '@shikijs/rehype/core'
import rehypeStringify from 'rehype-stringify'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import type { Element, Root } from 'hast'
import type { VFile } from 'vfile'

/** 媒体链接转换：音视频链接 → 原生播放器；外链新窗口打开；图片懒加载 */
function rehypeMedia() {
  const VIDEO = /\.(mp4|webm|mov)(\?.*)?$/i
  const AUDIO = /\.(mp3|wav|ogg|m4a)(\?.*)?$/i

  const walk = (node: Root | Element) => {
    if (!('children' in node)) return
    for (const child of node.children) {
      if (child.type !== 'element') continue
      const el = child as Element
      const href = String(el.properties?.href ?? '')

      if (el.tagName === 'a' && href) {
        if (VIDEO.test(href)) {
          el.tagName = 'video'
          el.properties = {
            src: href,
            controls: true,
            preload: 'metadata',
            className: ['w-full', 'rounded-lg'],
          }
        } else if (AUDIO.test(href)) {
          el.tagName = 'audio'
          el.properties = {
            src: href,
            controls: true,
            preload: 'metadata',
            className: ['w-full'],
          }
        } else if (/^https?:\/\//.test(href)) {
          el.properties.target = '_blank'
          el.properties.rel = ['noopener', 'noreferrer']
        }
      }

      if (el.tagName === 'img') {
        el.properties.loading = 'lazy'
        el.properties.className = [
          ...((el.properties.className as string[]) ?? []),
          'max-w-full',
          'h-auto',
          'rounded-lg',
        ]
      }

      walk(el)
    }
  }

  return (tree: Root) => walk(tree)
}

// 精简语言集：仅打包常用语言以适配 Cloudflare Workers 免费版 3MB 限制。
// 未列出的语言（如 php、swift、lua）会回退为纯文本渲染；如需支持，在此追加对应 import 即可。
const LANGS = [
  import('@shikijs/langs/javascript'),
  import('@shikijs/langs/typescript'),
  import('@shikijs/langs/jsx'),
  import('@shikijs/langs/tsx'),
  import('@shikijs/langs/html'),
  import('@shikijs/langs/css'),
  import('@shikijs/langs/scss'),
  import('@shikijs/langs/json'),
  import('@shikijs/langs/yaml'),
  import('@shikijs/langs/toml'),
  import('@shikijs/langs/markdown'),
  import('@shikijs/langs/bash'),
  import('@shikijs/langs/python'),
  import('@shikijs/langs/sql'),
  import('@shikijs/langs/go'),
  import('@shikijs/langs/rust'),
  import('@shikijs/langs/java'),
  import('@shikijs/langs/c'),
  import('@shikijs/langs/cpp'),
  import('@shikijs/langs/csharp'),
  import('@shikijs/langs/diff'),
  import('@shikijs/langs/dockerfile'),
]

/** 目录条目：h2/h3 标题及其锚点 id */
export interface TocItem {
  id: string
  text: string
  depth: 2 | 3
}

export interface RenderResult {
  html: string
  toc: TocItem[]
}

/** 目录提取：为 h2/h3 生成锚点 id，并通过 vfile.data 返回目录（每次 process 独立，无并发竞态） */
function rehypeHeadings() {
  const textOf = (el: Element): string => {
    let out = ''
    for (const child of el.children) {
      if (child.type === 'text') out += child.value
      else if (child.type === 'element') out += textOf(child)
    }
    return out
  }

  const collect = (node: Root | Element, toc: TocItem[], usedIds: Set<string>) => {
    if (!('children' in node)) return
    for (const child of node.children) {
      if (child.type !== 'element') continue
      const el = child as Element

      if (el.tagName === 'h2' || el.tagName === 'h3') {
        const text = textOf(el).trim()
        if (text) {
          // 保留中文/字母/数字，空白折叠为连字符，其余剔除
          let id =
            text
              .replace(/\s+/g, '-')
              .replace(/[#"'/\\%?&<>"`=]/g, '') || 'heading'
          // 去重
          let n = 1
          while (usedIds.has(id)) id = `${id}-${n++}`
          usedIds.add(id)

          el.properties.id = id
          toc.push({ id, text, depth: el.tagName === 'h2' ? 2 : 3 })
        }
      }

      collect(el, toc, usedIds)
    }
  }

  return (tree: Root, file: VFile) => {
    const toc: TocItem[] = []
    collect(tree, toc, new Set())
    file.data.toc = toc
  }
}

let processorPromise: ReturnType<typeof buildProcessor> | null = null

function buildProcessor() {
  return createHighlighterCore({
    themes: [import('@shikijs/themes/github-light'), import('@shikijs/themes/github-dark')],
    langs: LANGS,
    // JS 正则引擎替代 Oniguruma WASM，避免额外二进制体积
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  }).then((highlighter) =>
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeMedia)
      .use(rehypeShikiFromHighlighter, highlighter, {
        themes: { light: 'github-light', dark: 'github-dark' },
        fallbackLanguage: 'plaintext',
      })
      .use(rehypeHeadings)
      .use(rehypeStringify)
  )
}

/** 服务端渲染 Markdown 为 HTML（含 GFM、代码高亮、音视频渲染）并提取 h2/h3 目录 */
export async function renderMarkdown(markdown: string): Promise<RenderResult> {
  const processor = await (processorPromise ??= buildProcessor())
  const file = await processor.process(markdown)
  return { html: String(file), toc: (file.data.toc as TocItem[]) ?? [] }
}
