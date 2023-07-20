import { fetchOpenAIResponse } from './openAI'

function processPrompt(messages: any[]) {
  return messages
}

function processAttachment(messages: any[]) {
  return messages
}

function retrieval(messages: any[]) {
  return messages
}

export const extractAttachList = (message: string) => {
  const regex = /```attachment\n([\s\S]*?)\n```/g

  const attachments = []
  let cleanedString = message
  let match = regex.exec(message)

  while (match !== null) {
    attachments.push(JSON.parse(match[1]))
    cleanedString = cleanedString.replace(match[0], '')
    match = regex.exec(message)
  }

  return { attachments, cleanedString }
}

export const inference = (messages: any[]): Response => {
  let controller = null
  const stream = new ReadableStream({
    async start(ctrl) {
      controller = ctrl
    },
  })
  const resp = new Response(stream)

  messages = processAttachment(messages)
  messages = processPrompt(messages)
  fetchOpenAIResponse(messages, controller)

  return resp
}
