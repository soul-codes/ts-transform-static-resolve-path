A TypeScript path-transformer plugin that uses
[`require.resolve()`](https://nodejs.org/api/all.html#all_require_resolve)
on the import/export paths, outputting fully-specified `.js` paths (including
`index.js` that is omitted from the original path) so that ESM runtime is happy
with these fully-specified paths.

# Usage

This tool assumes you are using over-typescript tools such as `ts-patch`.
This transformer is known to work with TypeScript 5.x and `ts-patch` 3.x.

Add the following plugin configuration:

```json
// tsconfig.json
{
	"compilerOptions": {
		"module": "es2015",
		"plugins": [
			{
				"transform": "@soul-codes-dev/ts-transform-static-resolve-path",
				"after": true,
				"mapTsxToJs": true // optional, if not set, .tsx becomes .jsx.
			}
		]
	}
}
```

## Credits

This is based on a fork of
[@zoltu/typescript-transformer-append-js-extension](https://github.com/Zoltu/typescript-transformer-append-js-extension),
but it has since embarked on a different endeavor.
