/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly OPENAI_API_KEY: string
  readonly HTTPS_PROXY: string
  readonly OPENAI_API_BASE_URL: string
  readonly HEAD_SCRIPTS: string
  readonly PUBLIC_SECRET_KEY: string
  readonly SITE_PASSWORD: string
  readonly OPENAI_API_MODEL: string
  readonly OUTPUT: string
  readonly BAIDU_COOKIE: string
  readonly CLOUDFLARE_MOCK: boolean
  readonly ZILLIZ_API_KEY: string
  readonly ZILLIZ_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
