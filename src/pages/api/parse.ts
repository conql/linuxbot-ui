import { getRuntime } from '@/utils/runtime'
import type { KVNamespace } from '@cloudflare/workers-types'
import type { APIContext } from 'astro'

const BAIDU_COOKIE = import.meta.env.BAIDU_COOKIE

async function recognize(file_url: string) {
  const url = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate'
  const params = new URLSearchParams()
  params.append('image_url', file_url)
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
      throw new Error(`Response is not JSON. Possibly the url ${file_url} is invalid.`)
    }
    const words_result = json_response.words_result // array of {words: "xxx"}
    if (!words_result) throw new Error(`No words result. Response: ${JSON.stringify(json_response)}`)
    const result_text = words_result.map((item: any) => item.words).join(' ')
    return result_text
  } else {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

export async function get({ request }: APIContext) {
  const runtime = getRuntime(request)
  const { 'linuxbot-kv': kvdb } = (runtime.env as { 'linuxbot-kv': KVNamespace })

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
    const host = request.headers.get('host')
    // const host = 'linuxbot-ui.pages.dev'
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const url = `${protocol}://${host}/api/upload/${key}`
    try {
      object = await recognize(url)
    } catch (e) {
      return new Response(e.message, { status: 400 })
    }
    await kvdb.put(key, object)
  }
  return new Response(object)
}
