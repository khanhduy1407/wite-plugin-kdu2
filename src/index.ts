import { TemplateCompileOptions } from '@kdujs/component-compiler-utils'
import { normalizeComponentCode } from './utils/componentNormalizer'
import { kduHotReloadCode } from './utils/kduHotReload'
import fs from 'fs'
import { parseKduRequest } from './utils/query'
import { createFilter } from '@rollup/pluginutils'
import { transformMain } from './main'
import { compileSFCTemplate } from './template'
import { getDescriptor } from './utils/descriptorCache'
import { transformStyle } from './style'
import { WiteDevServer, Plugin } from 'wite'
import { SFCBlock } from '@kdujs/component-compiler-utils'
import { handleHotUpdate } from './hmr'
import { transformKduJsx } from './jsxTransform'

export const kduComponentNormalizer = '\0/wite/kduComponentNormalizer'
export const kduHotReload = '\0/wite/kduHotReload'

// extend the descriptor so we can store the scopeId on it
declare module '@kdujs/component-compiler-utils' {
  interface SFCDescriptor {
    id: string
  }
}

export interface KduWiteOptions {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  /**
   * The options for `@kdujs/component-compiler-utils`.
   */
  kduTemplateOptions?: Partial<TemplateCompileOptions>
  /**
   * The options for jsx transform
   * @default false
   */
  jsx?: boolean
  /**
   * The options for `@kdujs/babel-preset-jsx`
   */
  jsxOptions?: Record<string, any>
  /**
   * The options for esbuild to transform script code
   * @default 'esnext'
   * @example 'esnext' | ['esnext','chrome58','firefox57','safari11','edge16','node12']
   */
  target?: string | string[]
}

export interface ResolvedOptions extends KduWiteOptions {
  root: string
  devServer?: WiteDevServer
  isProduction: boolean
  target?: string | string[]
}

export function createKduPlugin(rawOptions: KduWiteOptions = {}): Plugin {
  const options: ResolvedOptions = {
    isProduction: process.env.NODE_ENV === 'production',
    ...rawOptions,
    root: process.cwd(),
  }

  const filter = createFilter(options.include || /\.kdu$/, options.exclude)

  return {
    name: 'wite-plugin-kdu2',

    config(config) {
      if (options.jsx) {
        return {
          esbuild: {
            include: /\.ts$/,
            exclude: /\.(tsx|jsx)$/,
          },
        }
      }
    },

    handleHotUpdate(ctx) {
      if (!filter(ctx.file)) {
        return
      }
      return handleHotUpdate(ctx, options)
    },

    configResolved(config) {
      options.isProduction = config.isProduction
      options.root = config.root
    },

    configureServer(server) {
      options.devServer = server
    },

    async resolveId(id) {
      if (id === kduComponentNormalizer || id === kduHotReload) {
        return id
      }
      // serve subpart requests (*?kdu) as virtual modules
      if (parseKduRequest(id).query.kdu) {
        return id
      }
    },

    load(id) {
      if (id === kduComponentNormalizer) {
        return normalizeComponentCode
      }

      if (id === kduHotReload) {
        return kduHotReloadCode
      }

      const { filename, query } = parseKduRequest(id)
      // select corresponding block for subpart virtual modules
      if (query.kdu) {
        if (query.src) {
          return fs.readFileSync(filename, 'utf-8')
        }
        const descriptor = getDescriptor(filename)!
        let block: SFCBlock | null | undefined

        if (query.type === 'script') {
          block = descriptor.script!
        } else if (query.type === 'template') {
          block = descriptor.template!
        } else if (query.type === 'style') {
          block = descriptor.styles[query.index!]
        } else if (query.index != null) {
          block = descriptor.customBlocks[query.index]
        }
        if (block) {
          return {
            code: block.content,
            map: block.map as any,
          }
        }
      }
    },

    async transform(code, id, transformOptions) {
      const { filename, query } = parseKduRequest(id)

      if (/\.(tsx|jsx)$/.test(id)) {
        return transformKduJsx(code, id, options.jsxOptions)
      }

      if ((!query.kdu && !filter(filename)) || query.raw) {
        return
      }

      if (!query.kdu) {
        // main request
        return await transformMain(code, filename, options, this)
      }

      const descriptor = getDescriptor(
        query.from ? decodeURIComponent(query.from) : filename
      )!
      // sub block request
      if (query.type === 'template') {
        return compileSFCTemplate(
          code,
          descriptor.template!,
          filename,
          options,
          this
        )
      }
      if (query.type === 'style') {
        return await transformStyle(
          code,
          filename,
          descriptor,
          Number(query.index),
          this
        )
      }
    },
  }
}
