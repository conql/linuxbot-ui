import { getRuntime } from '@/utils/runtime'
import type { KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import type { APIContext } from 'astro'

const BAIDU_COOKIE = import.meta.env.BAIDU_COOKIE

async function recognize(file: ArrayBuffer, contentType: string) {
  const url = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate'
  const params = new URLSearchParams()
  const file_data = btoa(new Uint8Array(file).reduce(
    (data, byte) => {
      return data + String.fromCharCode(byte)
    },
    '',
  ))
  params.append('image', `data:${contentType};base64,${file_data}`)
  params.append('type', url)

  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://ai.baidu.com/tech/ocr/general',
    'Cookie': BAIDU_COOKIE,
  }

  const response = await fetch('https://ai.baidu.com/aidemo', {
    method: 'POST',
    headers,
    body: params,
  })

  if (response.status === 200) {
    let json_response = { data: { words_result: [] } }
    try {
      json_response = await response.json()
    } catch {
      throw new Error('Response is not JSON.')
    }

    const words_result = json_response.data.words_result // array of {words: "xxx"}
    if (!words_result)
      throw new Error(`No words result. Response: ${JSON.stringify(json_response)}`)

    const result_text = words_result.map((item: any) => item.words).join(' ')
    return result_text
  } else {
    throw new Error(`HTTP error. Status: ${response.status}`)
  }
}

export async function parseLink(link: string, runtime: any) {
  const { 'linuxbot-kv': kvdb, 'linuxbot-r2': r2db } = (runtime.env as { 'linuxbot-kv': KVNamespace, 'linuxbot-r2': R2Bucket })
  let parsed = await kvdb.get(link)

  if (!parsed) {
    let file_data: ArrayBuffer
    let content_type: string

    if (!link.startsWith('/api/upload/')) {
      const file_resp = await fetch(link).catch(null)
      if (!file_resp)
        throw new Error(`Failed to fetch ${link}`)

      file_data = await file_resp.arrayBuffer()
      content_type = file_resp.headers.get('content-type') || 'image/png'
    } else {
      const key = link.replace('/api/upload/', '')
      const object = await r2db.get(key)
      if (!object)
        throw new Error(`Failed to fetch ${link}. Object not found.`)

      file_data = await object.arrayBuffer()
      content_type = object.httpMetadata.contentType || 'image/png'
    }

    try {
      parsed = await recognize(file_data, content_type)
    } catch (e) {
      throw new Error(`Failed to parse ${link}: ${e.message}`)
    }
    await kvdb.put(link, parsed)
  }

  return parsed
}

export async function get({ request }: APIContext) {
  const url = new URL(request.url)
  const link = url.searchParams.get('link')

  if (!link) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'Missing parameter "link"' }),
      headers: {
        'content-type': 'application/json',
      },
    }
  }

  const runtime = getRuntime(request)
  let parsed = null
  try {
    parsed = await parseLink(link, runtime)
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: {
          message: e.message,
        },
      }),
      { status: 500 })
  }

  return new Response(parsed)
}
