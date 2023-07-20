import { getRuntime as getCloudflareRuntime } from '@astrojs/cloudflare/runtime'
import { R2BucketMocker } from './r2mocker'
import { KVMocker } from './kvmocker'
import type { KVNamespace, R2Bucket } from '@cloudflare/workers-types'

const env = {
  'linuxbot-r2': new R2BucketMocker() as any as R2Bucket,
  'linuxbot-kv': new KVMocker() as any as KVNamespace,
}
const disableMock = !import.meta.env.CLOUDFLARE_MOCK

export const getMockerRuntime = (_t: any) => {
  return { env }
}

export const getRuntime = (t: any) => {
  if (disableMock)
    return getCloudflareRuntime(t)
  else
    return getMockerRuntime(t)
}
