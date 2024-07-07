import { existsSync } from 'node:fs'
import { parse, join, dirname } from 'node:path'

export function getRootDir(currentDir: string = process.cwd()): string {
    while (currentDir !== parse(currentDir).root) {
      if (existsSync(join(currentDir, 'package.json'))) {
        return currentDir
      }
  
      currentDir = dirname(currentDir)
    }
  
    throw ': Unable to find the root.'
}

export function resolvePath(...paths: string[]) {
    const rootDir = getRootDir()

    const path = join(...paths)
    if (path.includes(rootDir)) {
      return path
    }
  
    return join(rootDir, path)
}