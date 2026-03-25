import { writeFile, unlink, mkdir } from "fs/promises"
import { existsSync } from "fs"
import { join, dirname } from "path"

interface StorageService {
  upload(file: Buffer, path: string): Promise<string>
  delete(path: string): Promise<void>
  getUrl(path: string): string
}

class LocalStorageService implements StorageService {
  private basePath: string

  constructor() {
    this.basePath = join(process.cwd(), "public", "uploads")
  }

  async upload(file: Buffer, path: string): Promise<string> {
    const fullPath = join(this.basePath, path)
    const dir = dirname(fullPath)

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(fullPath, file)
    return this.getUrl(path)
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path)
    if (existsSync(fullPath)) {
      await unlink(fullPath)
    }
  }

  getUrl(path: string): string {
    return `/uploads/${path}`
  }
}

export const storageService: StorageService = new LocalStorageService()
