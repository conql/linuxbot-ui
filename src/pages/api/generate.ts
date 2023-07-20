// #vercel-end
import { getRuntime } from '@/utils/runtime'
import Langchain from '@/utils/langchain'
import type { APIRoute } from 'astro'

export const post: APIRoute = async(context) => {
  const body = await context.request.json()
  const { messages } = body
  if (!messages) {
    return new Response(JSON.stringify({
      error: {
        message: 'No input text.',
      },
    }), { status: 400 })
  }

  const langchain = new Langchain(messages, getRuntime(context.request))
  return langchain.inference()
}
