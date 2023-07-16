import { v4 as uuidv4 } from 'uuid'
import { getRuntime } from '@astrojs/cloudflare/runtime'
import type { R2Bucket } from '@cloudflare/workers-types'
import type { APIContext } from 'astro'

export async function put({ request }: APIContext) {
  const runtime = getRuntime(request)
  const { linuxbot } = (runtime.env as { linuxbot: R2Bucket })

  const file = await request.arrayBuffer()
  const key = uuidv4() // Generate a UUID for the file

  await linuxbot.put(key, file)
  return new Response(`File uploaded with UUID: ${key}`, {
    status: 200,
  })
}

export async function get({ request }: APIContext) {
  const runtime = getRuntime(request)
  const { linuxbot } = (runtime.env as { linuxbot: R2Bucket })

  const url = new URL(request.url)
  const key = url.searchParams.get('uuid') // Get the UUID from the query parameters

  if (!key) {
    return {
      status: 400,
      body: 'No UUID provided',
    }
  }

  const object = await linuxbot.get(key)

  if (object === null) {
    return {
      status: 404,
      body: 'File not found',
    }
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, {
    headers,
  })
}
