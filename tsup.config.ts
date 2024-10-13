import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'esnext',
  platform: 'node',
  dts: true,
  minify: true,
  splitting: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === 'esm'
        ? '.mjs'
        : format === 'cjs'
          ? '.cjs'
          : '.js',
    }
  },
})
