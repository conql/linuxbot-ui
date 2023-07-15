import { Index, createSignal } from 'solid-js'
import MarkdownIt from 'markdown-it'
import mdKatex from 'markdown-it-katex'
import mdHighlight from 'markdown-it-highlightjs'
import { useClipboard, useEventListener } from 'solidjs-use'
import IconRefresh from './icons/Refresh'
import Attachment from './Attachment'
import type { Accessor } from 'solid-js'
import type { ChatMessage } from '@/types'

interface Props {
  role: ChatMessage['role']
  message: Accessor<string> | string
  showRetry?: Accessor<boolean>
  onRetry?: () => void
}

function extractAttachList(inputString: string) {
  const regex = /```attachment\n([\s\S]*?)\n```/g

  const attachments = []
  let cleanedString = inputString
  let match = regex.exec(inputString)

  while (match !== null) {
    attachments.push(JSON.parse(match[1]))
    cleanedString = cleanedString.replace(match[0], '')
    match = regex.exec(inputString)
  }

  return { attachments, cleanedString }
}

export default ({ role, message: prop_message, showRetry, onRetry }: Props) => {
  const [source] = createSignal('')
  const { copy, copied } = useClipboard({ source, copiedDuring: 1000 })

  useEventListener('click', (e) => {
    const el = e.target as HTMLElement
    let code = null

    if (el.matches('div > div.copy-btn')) {
      code = decodeURIComponent(el.dataset.code!)
      copy(code)
    }
    if (el.matches('div > div.copy-btn > svg')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      code = decodeURIComponent(el.parentElement?.dataset.code!)
      copy(code)
    }
  })

  let message = typeof prop_message === 'function' ? prop_message() : prop_message
  const { attachments, cleanedString } = extractAttachList(message)
  message = cleanedString

  const beforeAttachList = attachments.filter(attach => attach.position === 'before')
  const afterAttachList = attachments.filter(attach => attach.position === 'after')

  console.log(beforeAttachList, afterAttachList)

  function htmlString() {
    const md = MarkdownIt({
      linkify: true,
      breaks: true,
    }).use(mdKatex).use(mdHighlight)
    const fence = md.renderer.rules.fence!
    md.renderer.rules.fence = (...args) => {
      const [tokens, idx] = args
      const token = tokens[idx]
      const rawCode = fence(...args)

      return `<div relative>
      <div data-code=${encodeURIComponent(token.content)} class="copy-btn gpt-copy-btn group">
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32"><path fill="currentColor" d="M28 10v18H10V10h18m0-2H10a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z" /><path fill="currentColor" d="M4 18H2V4a2 2 0 0 1 2-2h14v2H4Z" /></svg>
            <div class="group-hover:op-100 gpt-copy-tips">
              ${copied() ? '已复制' : '复制'}
            </div>
      </div>
      ${rawCode}
      </div>`
    }

    return md.render(message)
  }

  // const roleIconClass = {
  //   user: 'bg-gradient-to-r from-purple-400 to-yellow-400',
  //   assistant: 'bg-gradient-to-r from-yellow-200 via-green-200 to-green-300',
  // }
  // const roleIcon = (<div class={`shrink-0 w-7 h-7 mt-4 rounded-full op-80 ${roleIconClass[role]}`} />)

  let roleIcon = null
  if (role === 'user') {
    roleIcon = (
      <div class="shrink-0 w-7 h-7 mt-4 rounded-full op-80 bg-gradient-to-r from-purple-400 to-yellow-400" />
    )
  }
  if (role === 'assistant') {
    roleIcon = (
      <div
        class="shrink-0 w-7 h-7 mt-4 rounded-full op-80"
        style={{
          'font-size': '30px',
          'line-height': '25px',
          'margin-right': '8px',
        }}
      >
        🤖
      </div>
    )
  }

  return (
    <div class={role === 'user' ? 'flex-right' : 'flex-left'}>
      <Index each={beforeAttachList}>
        {attachment => (
          <div class={role === 'user' ? 'message-user' : 'message-gpt'}>
            <Attachment
              title={attachment().title}
              content={attachment().content}
              type={attachment().type}
              position={attachment().position}
            />
          </div>
        )}
      </Index>
      <div
        class={role === 'user' ? 'message-user' : 'message-gpt'}
        style={{
          'max-width': '70ch',
        }}
      >
        <div class="flex gap-3 rounded-lg">
          {/* {role === 'assistant' && roleIcon} */}
          <div class="message prose break-words overflow-hidden -my-4" innerHTML={htmlString()} />
          {/* {role === 'user' && roleIcon} */}
        </div>

        {showRetry?.() && onRetry && (
        <div class="fie px-3 mb-2">
          <div onClick={onRetry} class="gpt-retry-btn">
            <IconRefresh />
            <span>重新生成</span>
          </div>
        </div>
        )}

      </div>
      <Index each={afterAttachList}>
        {attachment => (
          <div class={role === 'user' ? 'message-user' : 'message-gpt'}>
            <Attachment
              title={attachment().title}
              content={attachment().content}
              type={attachment().type}
              position={attachment().position}
            />
          </div>
        )}
      </Index>
    </div>
  )
}
