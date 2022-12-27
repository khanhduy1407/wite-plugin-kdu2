import { SFCBlock } from '@kdujs/component-compiler-utils'
import * as kduTemplateCompiler from 'kdu-template-compiler'
import { TransformPluginContext } from 'rollup'
import { ResolvedOptions } from './index'
import { createRollupError } from './utils/error'
import { compileTemplate } from './template/compileTemplate'
import hash from 'hash-sum'

export function compileSFCTemplate(
  source: string,
  block: SFCBlock,
  filename: string,
  { isProduction, kduTemplateOptions = {} }: ResolvedOptions,
  pluginContext: TransformPluginContext
) {
  const { tips, errors, code } = compileTemplate({
    source,
    filename,
    compiler: kduTemplateCompiler as any,
    transformAssetUrls: true,
    transformAssetUrlsOptions: {
      forceRequire: true,
    },
    isProduction,
    isFunctional: !!block.attrs.functional,
    optimizeSSR: false,
    prettify: false,
    preprocessLang: block.lang,
    ...kduTemplateOptions,
    compilerOptions: {
      whitespace: 'condense',
      ...(kduTemplateOptions.compilerOptions || {}),
    },
  })

  if (tips) {
    tips.forEach((warn) =>
      pluginContext.warn({
        id: filename,
        message: typeof warn === 'string' ? warn : warn.msg,
      })
    )
  }

  if (errors) {
    const generateCodeFrame = (kduTemplateCompiler as any).generateCodeFrame
    errors.forEach((error) => {
      // 2.6 compiler outputs errors as objects with range
      if (
        generateCodeFrame &&
        kduTemplateOptions.compilerOptions?.outputSourceRange
      ) {
        const { msg, start, end } = error as kduTemplateCompiler.ErrorWithRange
        return pluginContext.error(
          createRollupError(filename, {
            message: msg,
            frame: generateCodeFrame(source, start, end),
          })
        )
      } else {
        pluginContext.error({
          id: filename,
          message: typeof error === 'string' ? error : error.msg,
        })
      }
    })
  }

  // rewrite require calls to import on build
  return {
    code:
      transformRequireToImport(code) + `\nexport { render, staticRenderFns }`,
    map: null,
  }
}

export function transformRequireToImport(code: string): string {
  const imports: { [key: string]: string } = {}
  let strImports = ''

  code = code.replace(
    /require\(("(?:[^"\\]|\\.)+"|'(?:[^'\\]|\\.)+')\)/g,
    (_, name): any => {
      if (!(name in imports)) {
        // #81 compat unicode assets name
        imports[name] = `__$_require_${hash(name)}__`
        strImports += 'import ' + imports[name] + ' from ' + name + '\n'
      }

      return imports[name]
    }
  )

  return strImports + code
}
