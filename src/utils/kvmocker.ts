export class KVMocker {
  private data: Record<string, any> = {}

  get(key: string) {
    return this.data[key]
  }

  put(key: string, value: any) {
    this.data[key] = value
  }
}
