This is a fork of
[@zoltu/typescript-transformer-append-js-extension](https://github.com/Zoltu/typescript-transformer-append-js-extension).
It lets ttypescript apply a Node resolution algorithm
([`require.resolve()`](https://nodejs.org/api/all.html#all_require_resolve)) on
each import path.

# Motivation

When supporting native ES modules in the Node environment, import paths are not
the same as require paths. ES module resolution algorithm is different
(see [`ESM_RESOLVE`](https://nodejs.org/api/esm.html#resolution-algorithm)from Node's
`require.resolve()` resolution algorithm. The most notable difference that will
bite most developers is that the ES algorithm requires explicit filenames. You
can no longer have `./foo` be interpreted as `./foo.js` or `./foo/index.js`,
as you would in Node's `require`-land.

Previously, Node-style path resolution could be used happily with ESM
syntax with the help of the [esm package](https://www.npmjs.com/package/esm).
Since the package has not been updated in several years, and with Node now
natively supporting ES modules, this transform tool will let you keep (most of)
your existing code.

# Usage

1. Install `typescript`, `ttypescript`, and this transformer into your project if you don't already have them.
   ```
   npm install --save-dev typescript
   npm install --save-dev ttypescript
   npm install --save-dev @soul-codes-dev/ts-transform-static-resolve-path
   ```
1. Add the transformer to your es2015 module `tsconfig-es.json` (or whatever `tsconfig.json` you are using to build es2015 modules)
   ```json
   // tsconfig-es.json
   {
   	"compilerOptions": {
   		"module": "es2015",
   		"plugins": [
   			{
   				"transform": "@soul-codes-dev/ts-transform-static-resolve-path",
   				"after": true
   			}
   		]
   	}
   }
   ```
1. Write some typescript with normal imports
   ```typescript
   // foo.ts
   export function foo() {
   	console.log("foo");
   }
   ```
   ```typescript
   // index.ts
   import { foo } from "./foo";
   foo();
   ```
1. Compile using `ttsc`
   ```
   ttsc --project tsconfig-es.json
   ```
