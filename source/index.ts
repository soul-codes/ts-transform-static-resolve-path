import * as path from "path";
import * as resolve from "resolve";
import * as typescript from "typescript";

const transformer = (
	_: typescript.Program,
	programOptions: {
		/**
		 * Keys are extensions that where `resolve`-based path transformation should
		 * be applied (e.g. `.ts`) and values are the matching extensions (e.g. `.js`)
		 * @example `{ ".ts": ".js" }`. Default is `{ ".ts": ".js", ".tsx": ".js" }`
		 */
		extensionMapping?: Readonly<Record<string, string>>;
	}
) => {
	const resolutionCache = new Map<string, string>();
	const extensionMapping = new Map(
		Object.entries(
			programOptions.extensionMapping || {
				".ts": ".js",
				".tsx": ".js",
			}
		)
	);

	const sourceExtensionsToResolve = [...extensionMapping.keys()];

	return (transformationContext: typescript.TransformationContext) => {
		return (sourceFile: typescript.SourceFile) => {
			const sourceDir = path.dirname(sourceFile.fileName);

			function resolvePath(importPath: string) {
				const cacheKey = JSON.stringify([sourceDir, importPath]);
				const cachedValue = resolutionCache.get(cacheKey);
				if (cachedValue != null) return cachedValue;

				let resolvedPath = importPath;
				try {
					resolvedPath = resolve.sync(resolvedPath, {
						basedir: sourceDir,
						extensions: sourceExtensionsToResolve,
					});
				} catch (error) {
					// ignore resolution error
				}

				if (path.isAbsolute(resolvedPath)) {
					let mappedPath = resolvedPath;
					const basename = path.basename(resolvedPath);
					for (const [srcExt, targetExt] of extensionMapping) {
						if (basename.endsWith(srcExt)) {
							mappedPath = path.resolve(
								path.dirname(resolvedPath),
								path.basename(basename, srcExt) + targetExt
							);
							break;
						}
					}

					const relativePath = path.relative(sourceDir, mappedPath);
					resolvedPath = relativePath.startsWith(".")
						? relativePath
						: "./" + relativePath;
				}

				resolutionCache.set(cacheKey, resolvedPath);
				return resolvedPath;
			}

			function visitNode(
				node: typescript.Node
			): typescript.VisitResult<typescript.Node> {
				if (shouldMutateModuleSpecifier(node)) {
					if (typescript.isImportDeclaration(node)) {
						const resolvedPath = resolvePath(node.moduleSpecifier.text);
						const newModuleSpecifier =
							transformationContext.factory.createStringLiteral(resolvedPath);
						return transformationContext.factory.updateImportDeclaration(
							node,
							node.decorators,
							node.modifiers,
							node.importClause,
							newModuleSpecifier,
							node.assertClause
						);
					} else if (typescript.isExportDeclaration(node)) {
						const resolvedPath = resolvePath(node.moduleSpecifier.text);
						const newModuleSpecifier =
							transformationContext.factory.createStringLiteral(resolvedPath);
						return transformationContext.factory.updateExportDeclaration(
							node,
							node.decorators,
							node.modifiers,
							node.isTypeOnly,
							node.exportClause,
							newModuleSpecifier,
							node.assertClause
						);
					}
				}

				return typescript.visitEachChild(
					node,
					visitNode,
					transformationContext
				);
			}

			function shouldMutateModuleSpecifier(node: typescript.Node): node is (
				| typescript.ImportDeclaration
				| typescript.ExportDeclaration
			) & {
				moduleSpecifier: typescript.StringLiteral;
			} {
				if (
					!typescript.isImportDeclaration(node) &&
					!typescript.isExportDeclaration(node)
				)
					return false;

				if (node.moduleSpecifier === undefined) return false;
				// only when module specifier is valid
				if (!typescript.isStringLiteral(node.moduleSpecifier)) return false;
				// only when path is relative
				if (
					!node.moduleSpecifier.text.startsWith("./") &&
					!node.moduleSpecifier.text.startsWith("../")
				)
					return false;
				// only when module specifier has no extension
				if (path.extname(node.moduleSpecifier.text) !== "") return false;
				return true;
			}

			return typescript.visitNode(sourceFile, visitNode);
		};
	};
};

export default transformer;
