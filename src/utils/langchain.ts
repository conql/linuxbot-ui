import { parseLink } from '@/pages/api/parse'
import { fetchOpenAIResponse } from './openAI'
import type { Attachment, ChatMessage } from '@/types'
export default class Langchain {
  messages: ChatMessage[]
  runtime: any

  constructor(messages: ChatMessage[], runtime: any) {
    this.messages = messages
    this.runtime = runtime
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
    const processed = []
    for (const message of this.messages) {
      const { attachments, cleanedString } = extractAttachList(message.content)
      const pre_attach = []; const post_attach = []
      for (const attach of attachments) {
        if (attach.type === 'image') {
          const parsedContent = await parseLink(attach.content, this.runtime)
            .then(r => `Parsed content: ${r}`)
            .catch(e => `Parsed failed: ${e.message}`)

          if (attach.position === 'before')
            pre_attach.push({ title: attach.title, type: attach.type, content: parsedContent })
          else
            post_attach.push({ title: attach.title, type: attach.type, content: parsedContent })
        }
      }
      const newMsg = {
        ...message,
        content: [attachmentsToText(pre_attach), cleanedString, attachmentsToText(post_attach)].join('\n'),
      }
      processed.push(newMsg)
    }
    this.messages = processed
  }

  async retrieval() {

  }

  async inference(): Promise<Response> {
    let controller = null
    const stream = new ReadableStream({
      async start(ctrl) {
        controller = ctrl
      },
    })
    const resp = new Response(stream)

    await this.processPrompt()
    console.log(this.messages)
    fetchOpenAIResponse(this.messages, controller)

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
