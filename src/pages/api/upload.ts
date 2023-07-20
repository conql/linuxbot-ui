import { v4 as uuidv4 } from 'uuid'
import { getRuntime } from '@/utils/runtime'
import type { R2Bucket } from '@cloudflare/workers-types'
import type { APIContext } from 'astro'

export async function put({ request }: APIContext) {
  const runtime = getRuntime(request)
  const { 'linuxbot-r2': r2db } = (runtime.env as { 'linuxbot-r2': R2Bucket })

  const file = await request.arrayBuffer()
  const key = uuidv4() // Generate a UUID for the file

  const contentType = request.headers.get('content-type') || 'application/octet-stream'
  await r2db.put(key, file, {
    httpMetadata: {
      contentType,
    },
  })

  return new Response(JSON.stringify({ id: key }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}
