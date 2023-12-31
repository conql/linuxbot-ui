import { createParser } from 'eventsource-parser'
import type { ParsedEvent, ReconnectInterval } from 'eventsource-parser'
import type { ChatMessage } from '@/types'

const model = import.meta.env.OPENAI_API_MODEL || 'gpt-3.5-turbo'
const apiKey = import.meta.env.OPENAI_API_KEY
const baseUrl = ((import.meta.env.OPENAI_API_BASE_URL) ?? 'ERROR').trim().replace(/\/$/, '')

export const fetchOpenAIResponse = async(messages: ChatMessage[], controller: ReadableStreamDefaultController<any>) => {
  const payload = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      stream: true,
    }),
  }

  const encoder = new TextEncoder()

  let response: Response
  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, payload)
  } catch (err) {
    const errResp = JSON.stringify({
      error: {
        code: err.name,
        message: err.message,
      },
    })

    controller.enqueue(encoder.encode(JSON.stringify(errResp)))
  }

  await parseOpenAIStream(response, controller)
}

export const parseOpenAIStream = async(rawResponse: Response, controller: ReadableStreamDefaultController<any>) => {
  const promise = new Promise<void>((resolve, reject) => {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const streamParser = (event: ParsedEvent | ReconnectInterval) => {
      if (event.type === 'event') {
        const data = event.data
        if (data === '[DONE]')
          resolve()

        try {
          const json = JSON.parse(data)
          const text = json.choices[0].delta?.content || ''
          const queue = encoder.encode(text)
          controller.enqueue(queue)
        } catch (e) {
          reject(e)
        }
      }
    }

    (async() => {
      const parser = createParser(streamParser)
      for await (const chunk of rawResponse.body as any)
        parser.feed(decoder.decode(chunk))
    })()
  })

  return promise
}
