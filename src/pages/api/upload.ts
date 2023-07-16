import { v4 as uuidv4 } from 'uuid'
import { getRuntime } from '@astrojs/cloudflare/runtime'
import type { R2Bucket } from '@cloudflare/workers-types'
import type { APIContext } from 'astro'

export async function put({ request }: APIContext) {
  const runtime = getRuntime(request)
  const { linuxbot } = (runtime.env as { linuxbot: R2Bucket })

  const file = await request.arrayBuffer()
  const key = uuidv4() // Generate a UUID for the file

  await linuxbot.put(key, file, {
    httpMetadata: {
      contentType: request.headers.get('content-type') || 'application/octet-stream',
    },
  })

  return new Response(JSON.stringify({ id: key }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}

export async function get({ request }: APIContext) {
  const runtime = getRuntime(request)
  const { linuxbot } = (runtime.env as { linuxbot: R2Bucket })

  const url = new URL(request.url)
  const key = url.searchParams.get('id') // Get the UUID from the query parameters

  if (!key) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'Missing id query parameter' }),
      headers: {
        'content-type': 'application/json',
      },
    }
  }

  const object = await linuxbot.get(key)

  if (object === null) {
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

  return new Response(object.body as ReadableStream<any>, {
    headers,
  })
}
