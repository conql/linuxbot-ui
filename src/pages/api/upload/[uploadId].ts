import { getRuntime } from '@/utils/runtime'
import type { R2Bucket } from '@cloudflare/workers-types'
import type { APIContext } from 'astro'

export async function get({ params, request }: APIContext) {
  const runtime = getRuntime(request)
  const { 'linuxbot-r2': r2db } = (runtime.env as { 'linuxbot-r2': R2Bucket })

  const key = params.uploadId
  if (!key) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'Missing id query parameter' }),
      headers: {
        'content-type': 'application/json',
      },
    }
  }

  const object = await r2db.get(key)

  if (!object) {
    return {
      status: 404,
      body: JSON.stringify({ error: 'File not found' }),
      headers: {
        'content-type': 'application/json',
      },
    }
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers as any)
  headers.set('etag', object.httpEtag)
  object.customMetadata.text && headers.set('x-text', object.customMetadata.text)

  return new Response(object.body as ReadableStream<any>, {
    headers,
  })
}
