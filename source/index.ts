import * as path from "path";
import * as resolve from "resolve";
import * as typescript from "typescript";

const transformer = (_: typescript.Program) => {
	const resolutionCache = new Map<string, string>();

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
						extensions: [".ts", ".tsx"],
					});
				} catch (error) {
					// ignore resolution error
				}

				if (path.isAbsolute(resolvedPath)) {
					const extension =
						(/\.tsx?$/.exec(path.basename(resolvedPath)) || [])[0] || void 0;
					const mappedExtension =
						extension == ".ts" ? ".js" : extension === ".tsx" ? ".jsx" : "";

					resolvedPath =
						"./" +
						path.relative(
							sourceDir,
							path.resolve(
								path.dirname(resolvedPath),
								path.basename(resolvedPath, extension) + mappedExtension
							)
						);
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
