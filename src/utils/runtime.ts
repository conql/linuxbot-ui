import { getRuntime as getCloudflareRuntime } from '@astrojs/cloudflare/runtime'
import { R2BucketMocker } from './r2mocker'
import { KVMocker } from './kvmocker'

const env = {
  'linuxbot-r2': new R2BucketMocker() as any,
  'linuxbot-kv': new KVMocker() as any,
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
