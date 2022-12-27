# wite-plugin-kdu2

## Install

```bash
npm install wite-plugin-kdu2 -D
```

```js
// wite.config.js
import { createKduPlugin } from 'wite-plugin-kdu2'

export default {
  plugins: [
    createKduPlugin(/* options */)
  ],
}
```

## [Options](https://github.com/khanhduy1407/wite-plugin-kdu2/blob/master/src/index.ts#L26)

### `kduTemplateOptions`

Type: `Object`<br>

Default: `{ compilerOptions :{ whitespace: 'condense' }   }`

**Note {  whitespace: 'condense' } behavior**

* A whitespace-only text node between element tags is removed if it contains new lines. Otherwise, it is condensed into a single space.

* Consecutive whitespaces inside a non-whitespace-only text node are condensed into a single space.


Using condense mode will result in smaller compiled code size and slightly improved performance. However, it will produce minor visual layout differences compared to plain HTML in certain cases,if you want to keep whitespace  behavior, please set `{ whitespace: 'preserve' }`

The options for `@kdujs/component-compiler-utils`.

### `jsx`

Type: `Boolean`<br>
Default: `false`

The options for jsx transform.

### `jsxOptions`

Type: `Object`<br>

The options for `@kdujs/babel-preset-jsx`.

### `target`

Type: `String`<br>

The options for esbuild to transform script code

## Todo

- SSR Build
- Sourcemap
