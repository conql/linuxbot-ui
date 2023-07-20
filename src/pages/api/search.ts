import { getEmbedding } from './embedding'
import type { APIContext } from 'astro'

const API_KEY = import.meta.env.ZILLIZ_API_KEY
const BASE_URL = import.meta.env.ZILLIZ_API_BASE_URL

async function getSimilar(vector: number[], limit = 3, gate = 0.4, outputFields = ['title', 'content']): Promise<any[]> {
  const requestData = {
    collectionName: 'Chaoxing_GPT4_1',
    vector,
    limit: 10,
    outputFields,
  }

  const response = await fetch(`${BASE_URL}/v1/vector/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(requestData),
  })

  if (!response.ok)
    throw new Error(`HTTP error. Status: ${response.status}`)

  let data = await response.json().then(r => r.data)
  data = data.filter((item: any) => item.distance <= gate)
  data = data.slice(0, limit)
  return data
}

export async function search(query: string): Promise<any[]> {
  const embedding = await getEmbedding(query)
  const similar = await getSimilar(embedding)
  return similar
}

export async function get({ request }: APIContext) {
  const query = new URL(request.url).searchParams.get('query')
  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing parameter "query"' }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
      },
    })
  }

  let similar: any[]
  try {
    similar = await search(query)
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
      },
    })
  }

  return new Response(JSON.stringify(similar), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}
