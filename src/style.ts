import { TransformPluginContext } from 'rollup'
import { compileStyle, SFCDescriptor } from '@kdujs/component-compiler-utils'

export async function transformStyle(
  code: string,
  filename: string,
  descriptor: SFCDescriptor,
  index: number,
  pluginContext: TransformPluginContext
) {
  const block = descriptor.styles[index]
  // wite already handles pre-processors and CSS module so this is only
  // applying SFC-specific transforms like scoped mode and CSS vars rewrite (k-bind(var))
  const result = compileStyle({
    source: code,
    filename,
    id: `data-k-${descriptor.id}`,
    map: pluginContext.getCombinedSourcemap(),
    scoped: !!block.scoped,
    trim: true,
  })

  if (result.errors.length) {
    result.errors.forEach((error) =>
      pluginContext.error({ id: filename, message: error })
    )
    return null
  }

  return {
    code: result.code,
    map: result.map as any,
  }
}
