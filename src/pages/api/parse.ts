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
    let json_response = { words_result: [] }
    try {
      json_response = await response.json().then(r => r.data)
    } catch {
      throw new Error('Response is not JSON.')
    }

    const words_result = json_response.words_result // array of {words: "xxx"}
    if (!words_result)
      throw new Error(`No words result. Response: ${JSON.stringify(json_response)}`)

    const result_text = words_result.map((item: any) => item.words).join(' ')
    return result_text
  } else {
    throw new Error(`HTTP error. Status: ${response.status}`)
  }
}

export async function get({ request }: APIContext) {
  const runtime = getRuntime(request)
  const { 'linuxbot-kv': kvdb, 'linuxbot-r2': r2db } = (runtime.env as { 'linuxbot-kv': KVNamespace, 'linuxbot-r2': R2Bucket })

  const url = new URL(request.url)
  const key = url.searchParams.get('id')

  if (!key) {
    return {
      status: 400,
      body: JSON.stringify({ error: 'Missing id query parameter' }),
      headers: {
        'content-type': 'application/json',
      },
    }
  }

  let object = await kvdb.get(key)
  if (!object) {
    const file_data = await r2db.get(key)

    if (!file_data) {
      return {
        status: 404,
        body: JSON.stringify({ error: 'File not found' }),
        headers: {
          'content-type': 'application/json',
        },
      }
    }

    try {
      object = await recognize(await file_data.arrayBuffer(), file_data.httpMetadata.contentType)
    } catch (e) {
      return new Response(e.message, { status: 400 })
    }
    await kvdb.put(key, object)
  }
  return new Response(object)
}
