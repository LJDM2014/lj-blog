'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const VIDEO = /\.(mp4|webm|mov)(\?.*)?$/i
const AUDIO = /\.(mp3|wav|ogg|m4a)(\?.*)?$/i

/** 编辑器预览用的轻量 Markdown 渲染（与正式页同源的音视频/图片规则） */
export default function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const h = href ?? ''
            if (VIDEO.test(h)) {
              return (
                <video
                  src={h}
                  controls
                  preload="metadata"
                  className="w-full rounded-lg"
                />
              )
            }
            if (AUDIO.test(h)) {
              return <audio src={h} controls preload="metadata" className="w-full" />
            }
            if (/^https?:\/\//.test(h)) {
              return (
                <a href={h} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              )
            }
            return <a href={h}>{children}</a>
          },
          img: (props) => (
            <img
              {...props}
              loading="lazy"
              className="max-w-full h-auto rounded-lg"
            />
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-4 text-sm">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
