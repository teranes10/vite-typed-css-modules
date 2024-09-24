import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { type AcceptedPlugin as PostcssPlugin } from 'postcss'
import { type Plugin } from 'vite'
import { camelCase, kebabCase } from 'lodash-es'
import { resolvePath } from './utils/resolvePath'

const formattingOptions = {
  'camelCase': {
    viteLocalsConvention: 'camelCaseOnly',
    format: (value: string) => camelCase(value),
  },
  'kebab-case': {
    viteLocalsConvention: 'dashesOnly',
    format: (value: string) => `'${kebabCase(value)}'`,
  },
} as const

export interface TypedCssModulesOptions {
  rootDir?: string
  typeRootDir?: string
  format?: keyof typeof formattingOptions
  hashLength?: number
}

export default function typedCssModulesVite({ rootDir = 'src', typeRootDir, format = 'camelCase', hashLength = 6 }: TypedCssModulesOptions = {}): Plugin {
  function postcssPlugin(): PostcssPlugin {
    return {
      postcssPlugin: 'postcss-typed-css-modules',
      Root(root) {
        const filePath = root.source?.input?.from
        if (!isValidCssFile(filePath)) {
          return
        }

        const selectors = new Set<string>()

        root.walkRules(rule => rule.selectors.forEach((selector) => {
          const classes = getSelectorClasses(selector)
          if (!classes) {
            return
          }

          classes
            .map(className => formattingOptions[format].format(className))
            .forEach(className => selectors.add(className))
        }))

        if (!selectors.size) {
          return
        }

        const outputPath = getDeclarationFilePath(filePath, { rootDir, typeRootDir })
        generateCssModuleDeclarationFile(Array.from(selectors), outputPath)
      },
    }
  }

  return {
    name: 'vite-typed-css-modules',
    config() {
      return {
        css: {
          modules: {
            localsConvention: formattingOptions[format].viteLocalsConvention,
            generateScopedName: process.env.NODE_ENV === 'production' ? `[hash:base64:${hashLength}]` : `[local]_[hash:base64:${hashLength}]`,
          },
          postcss: {
            plugins: [postcssPlugin()],
          },
        },
      }
    },
  }
}

function getDeclarationFilePath(filePath: string, { rootDir, typeRootDir }: { rootDir: string, typeRootDir?: string }) {
  if (!typeRootDir) {
    return filePath + '.d.ts'
  }

  const path = filePath.replace(resolvePath(rootDir), '')
  const typeFilePath = resolvePath(typeRootDir, path)
  return typeFilePath + '.d.ts'
}

async function generateCssModuleDeclarationFile(keys: string[], outputFilePath: string) {
  let data = `declare const styles: {\n`

  for (const key of keys) {
    data += `  readonly ${key}: string\n`
  }

  data += `}\n\n`
  data += `export default styles\n`

  const outputDirPath = dirname(outputFilePath)
  if (outputDirPath) {
    mkdirSync(outputDirPath, { recursive: true })
  }

  writeFileSync(outputFilePath, data, 'utf-8')
}

function getSelectorClasses(selector?: string) {
  return selector?.match(new RegExp(selectorMatches.class, 'g'))
}

const selectorMatches = {
  id: /#[\w-]+/,
  class: /\.[\w-]+/,
  elementTag: /\w+/,
  attribute: /\[\w+([~|^$*]?=.+)?\]/,
  pseudo: /::?[\w-]+(\([^()]+\))?/,
  universal: /\*/,
} as const

function isValidCssFile(filePath?: string): filePath is string {
  if (!filePath) {
    return false
  }

  // check path endsWith .module.css
  if (!/\.module\.css$/.test(filePath)) {
    return false
  }

  // check is not a vue SFC's style tag with module
  return !/\?|&vue/.test(filePath)
}
