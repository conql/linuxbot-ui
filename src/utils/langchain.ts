import { parseLink } from '@/pages/api/parse'
import { search } from '@/pages/api/search'
import { fetchOpenAIResponse } from './openAI'
import type { Attachment, ChatMessage } from '@/types'
export default class Langchain {
  messages: ChatMessage[]
  runtime: any
  controller: ReadableStreamDefaultController<any>
  stream: ReadableStream<any>

  constructor(messages: ChatMessage[], runtime: any) {
    this.messages = messages
    this.runtime = runtime

    const setController = (ctrl) => {
      this.controller = ctrl
    }

    this.stream = new ReadableStream({
      async start(ctrl) {
        setController(ctrl)
      },
    })
  }

  async processPrompt() {
    this.messages.unshift({
      role: 'system',
      content: 'You are ChatGPT with attachemnts. User will upload images or other files as markdown codeblock "attachment". All attachments have been parsed in the format: "Parsed content: description of the attachment". You answer their question utilizing this description.',
    })
    await this.processAttachment()
    await this.retrieval()
  }

  async processAttachment() {
    for (const message of this.messages) {
      const { attachments, cleanedString } = extractAttachList(message.content)
      const pre_attach = []; const post_attach = []
      for (const attach of attachments) {
        if (attach.type === 'image') {
          const parsedContent = await parseLink(attach.content, this.runtime)
            .then(r => `Parsed content: ${r}`)
            .catch(e => `Parsed failed: ${e.message}`)
          attach.content = parsedContent
        }
        if (attach.type === 'knowledge')
          continue // Skip knowledge attachment
        if (attach.position === 'before')
          pre_attach.push({ title: attach.title, type: attach.type, content: attach.content })
        else
          post_attach.push({ title: attach.title, type: attach.type, content: attach.content })
      }
      message.content = [attachmentsToText(pre_attach), cleanedString, attachmentsToText(post_attach)].join('\n')
    }
  }

  async retrieval() {
    const lastMsg = this.messages[this.messages.length - 1]
    const { attachments, cleanedString } = extractAttachList(lastMsg.content)
    const attachemnts_query = attachments.map(a => `# ${a.title}\n${a.content}`).join('\n')
    const query = [cleanedString, attachemnts_query].join('\n')

    if (lastMsg.role === 'user') {
      const relevants = await search(query)
      const relevantAttachments = relevants.map(r => ({
        type: 'knowledge',
        title: `知识点：${r.title}`,
        content: r.content,
      } as Attachment))

      const text = `${attachmentsToText(relevantAttachments)}\n`

      if (text.trim() === '')
        return

      this.messages.push({
        role: 'assistant',
        content: text,
      })

      const encoder = new TextEncoder()
      this.controller.enqueue(encoder.encode(text))
    }
  }

  async inference(): Promise<Response> {
    const resp = new Response(this.stream)

    await this.processPrompt()
    console.log(this.messages)
    fetchOpenAIResponse(this.messages, this.controller)
      .then(() => {
        this.controller.close()
      })
      .catch((e) => {
        console.error(e)
        this.controller.error(e)
      })
    return resp
  }
}

export const extractAttachList = (message: string): { attachments: Array<Attachment>, cleanedString: string } => {
  const regex = /```attachment\n([\s\S]*?)\n```/g

  const attachments = []
  let cleanedString = message
  let match = regex.exec(message)

  while (match !== null) {
    let attach: Attachment
    try {
      attach = JSON.parse(match[1])
    } catch (e) {
      attach = { type: 'text', title: 'error', content: `Malformed attachment${match[1]}` }
    }
    attachments.push(attach)
    cleanedString = cleanedString.replace(match[0], '')
    match = regex.exec(message)
  }

  return { attachments, cleanedString }
}

export const attachmentsToText = (attachments: Array<Attachment>): string => {
  return attachments
    .map(attach => `\`\`\`attachment\n${JSON.stringify(attach)}\n\`\`\``)
    .join('\n')
}
