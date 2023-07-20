export interface R2StringChecksums {
  md5?: string
  sha1?: string
  sha256?: string
  sha384?: string
  sha512?: string
}
export interface R2Checksums {
  readonly md5?: ArrayBuffer
  readonly sha1?: ArrayBuffer
  readonly sha256?: ArrayBuffer
  readonly sha384?: ArrayBuffer
  readonly sha512?: ArrayBuffer
  toJSON(): R2StringChecksums
}
export interface R2HTTPMetadata {
  contentType?: string
  contentLanguage?: string
  contentDisposition?: string
  contentEncoding?: string
  cacheControl?: string
  cacheExpiry?: Date
}
export interface R2ObjectBody extends R2Object {
  get body(): ReadableStream
  get bodyUsed(): boolean
  arrayBuffer(): Promise<ArrayBuffer>
  text(): Promise<string>
  json<T>(): Promise<T>
  blob(): Promise<Blob>
}
export interface R2Conditional {
  etagMatches?: string
  etagDoesNotMatch?: string
  uploadedBefore?: Date
  uploadedAfter?: Date
  secondsGranularity?: boolean
}
export interface R2PutOptions {
  onlyIf?: R2Conditional | Headers
  httpMetadata?: R2HTTPMetadata | Headers
  customMetadata?: Record<string, string>
  md5?: ArrayBuffer | string
  sha1?: ArrayBuffer | string
  sha256?: ArrayBuffer | string
  sha384?: ArrayBuffer | string
  sha512?: ArrayBuffer | string
}
export type R2Range =
    | {
      offset: number
      length?: number
    }
    | {
      offset?: number
      length: number
    }
    | {
      suffix: number
    }

export class R2Object implements R2ObjectBody {
  private _body: any
  private _bodyUsed = false
  key: string
  version: string
  size: number
  etag: string
  httpEtag: string
  checksums: R2Checksums | undefined
  uploaded: Date
  httpMetadata?: R2HTTPMetadata
  customMetadata?: Record<string, string>
  range?: R2Range

  constructor(
    body: ArrayBuffer,
    key: string,
    options?: R2PutOptions,
  ) {
    this._body = body

    this.key = key
    this.version = '1.0'
    this.size = this._body ? this._body.length : 0
    this.etag = 'etag'
    this.httpEtag = 'httpEtag'
    this.uploaded = new Date()
    this.httpMetadata = options?.httpMetadata as R2HTTPMetadata || {}
    this.customMetadata = options?.customMetadata || {}
    this.range = undefined
  }

  get body(): ReadableStream<any> {
    this._bodyUsed = true
    const data = Buffer.from(this._body)
    return new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      },
    })
  }

  get bodyUsed(): boolean {
    return this._bodyUsed
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this._body
  }

  async text(): Promise<string> {
    const decoder = new TextDecoder()
    return decoder.decode(this._body)
  }

  async json<T>(): Promise<T> {
    const text = await this.text()
    return JSON.parse(text)
  }

  async blob(): Promise<Blob> {
    return new Blob([this._body])
  }

  async writeHttpMetadata() {

  }
}

export class R2BucketMocker {
  private data: Record<string, R2Object> = {}

  get(key: string) {
    return this.data[key]
  }

  async put(
    key: string,
    value: ArrayBuffer,
    options?: R2PutOptions,
  ): Promise<R2Object> {
    const mockerObj = new R2Object(value, key, options)
    this.data[key] = mockerObj
    return mockerObj
  }
}
