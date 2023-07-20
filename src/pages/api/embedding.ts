import type { APIContext } from 'astro'

const apiKey = import.meta.env.OPENAI_API_KEY
const baseUrl = ((import.meta.env.OPENAI_API_BASE_URL) ?? 'ERROR').trim().replace(/\/$/, '')

export async function getEmbedding(text: string): Promise<number[] | null> {
  // Define the API endpoint
  const url = `${baseUrl}/v1/embeddings`

  // Define the headers for the API request
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  // Define the data for the API request
  const data = { model: 'text-embedding-ada-002', input: text }

  // Make the API request
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })

  // Check if the request was successful
  if (response.status === 200) {
    // Extract the embedding from the response
    const jsonData = await response.json()
    const embedding = jsonData.data[0].embedding
    return embedding
  } else {
    throw new Error(`Request failed with status code ${response.status}`)
  }
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

  let embedding: number[] | null
  try {
    embedding = await getEmbedding(query)
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: {
        'content-type': 'application/json',
      },
    })
  }

  return new Response(JSON.stringify(embedding), {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  })
}
