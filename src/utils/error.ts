import { RollupError } from 'rollup'

export function createRollupError(id: string, error: any): RollupError {
  ;(error as RollupError).id = id
  ;(error as RollupError).plugin = 'wite-plugin-kdu2'

  return error as RollupError
}
