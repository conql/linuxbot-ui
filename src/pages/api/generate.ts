// #vercel-end
import { inference } from '@/utils/langchain'
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
  return inference(messages)
}
