import path from 'path'
import { conditional } from '../../shared/lib/eslint'
import { readJson } from '../../shared/lib/fs'
import { Jsconfig } from '../../shared/types'
import { Meta } from '../shared'
import { Options } from './types'

export interface Input {
  options?: Options
  meta: Meta
}

export function createAliasSettings({ options = {}, meta }: Input) {
  const { alias: aliasOptions = {} } = options
  const {
    root = meta.root,
    paths = {},
    jsconfig = 'jsconfig.json',
  } = aliasOptions

  const jsconfigJson = readJson<Jsconfig>(meta.root, jsconfig)
  const jsconfigAlias = generateJsconfigAlias(jsconfigJson, meta.root)

  const customAlias = Object.entries(paths).reduce<Record<string, string>>(
    (alias, [key, value]) => {
      alias[key] = path.join(root, value)
      return alias
    },
    {}
  )

  const alias = {
    ...jsconfigAlias,
    ...customAlias,
  }

  return {
    'import/resolver': {
      'eslint-import-resolver-custom-alias': {
        alias,
        extensions: meta.imports.extensions,
      },
      ...conditional.settings(meta.typescript.used, {
        typescript: {
          alwaysTryTypes: true,
          project: meta.typescript.tsconfig,
        },
      }),
    },
  }
}

function generateJsconfigAlias(jsconfig: Jsconfig | null, root: string) {
  if (!jsconfig) return {}
  const { compilerOptions = {} } = jsconfig
  const { baseUrl, paths = {} } = compilerOptions

  const alias: Record<string, string> = {}

  if (baseUrl) {
    alias[''] = path.resolve(root, baseUrl)
  }

  for (const [target, sources] of Object.entries(paths)) {
    if (sources.length === 0) continue
    const [source] = sources

    alias[removeStars(target)] = baseUrl
      ? path.resolve(root, baseUrl, removeStars(source))
      : path.resolve(root, removeStars(source))
  }

  return alias
}

function removeStars(string: string) {
  return string.replace(/\/\*/g, '')
}
