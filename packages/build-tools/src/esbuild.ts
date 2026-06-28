import { readFileSync, existsSync, statSync } from "fs";
import { dirname, resolve, extname, parse } from "path";
import { parseCircular, parseDependencyTree, prettyCircular } from "dpdm";
import type { BuildOptions, PartialMessage, Plugin } from "esbuild";

/**
 * Custom esbuild plugin to add .js extension only to relative file imports.
 * This plugin transforms TypeScript source code before compilation to ensure
 * that all relative imports (starting with ./ or ../) that point to files
 * have .js extensions, which is required for ESM modules in Node.js.
 *
 * External packages from node_modules and directory imports are NOT modified.
 */
export const addJsExtensionPlugin: Plugin = {
  name: "add-js-extension",
  setup(build) {
    build.onLoad({ filter: /\.ts$/ }, async (args) => {
      const source = readFileSync(args.path, "utf8");
      const currentDir = dirname(args.path);

      // Add .js extension to relative imports (./foo or ../bar)
      // This regex matches:
      // - from 'path' or from "path"
      // - where path starts with ./ or ../
      // - and doesn't already end with .js or .json
      const transformed = source.replace(
        /from\s+(['"])(\.\S+?)(?<!\.js)(?<!\.json)\1/g,
        (match, quote, path) => {
          // Resolve the absolute path of the import
          const absolutePath = resolve(currentDir, path);

          // Check if this is a directory
          if (existsSync(absolutePath) && statSync(absolutePath).isDirectory()) {
            // Don't add extension for directory imports
            return match;
          }

          // Check if the import already has a file extension
          const ext = extname(path);
          if (ext && ext !== ".js") {
            // If it has an extension (like .json), don't modify
            return match;
          }

          // Check if the file exists with .ts or .tsx extension
          const tsFile = existsSync(absolutePath + ".ts");
          const tsxFile = existsSync(absolutePath + ".tsx");

          if (tsFile || tsxFile) {
            // This is a file import, add .js extension
            return `from ${quote}${path}.js${quote}`;
          }

          // If file doesn't exist, it might be handled by other resolvers
          // In this case, assume it's a file and add .js
          return `from ${quote}${path}.js${quote}`;
        }
      );

      return {
        contents: transformed,
        loader: "ts",
      };
    });
  },
};

function getEntryPointPaths(entryPoints: BuildOptions["entryPoints"]): string[] {
  if (!entryPoints) return [];

  if (Array.isArray(entryPoints)) {
    return entryPoints.map((entryPoint) => {
      if (typeof entryPoint === "string") return entryPoint;
      return entryPoint.in;
    });
  }

  return Object.values(entryPoints);
}

function findNearestTsconfigDir(filePath: string): string | undefined {
  let currentDir = dirname(resolve(filePath));
  const rootDir = parse(currentDir).root;

  while (currentDir !== rootDir) {
    if (existsSync(resolve(currentDir, "tsconfig.json"))) {
      return currentDir;
    }

    currentDir = dirname(currentDir);
  }

  return existsSync(resolve(rootDir, "tsconfig.json")) ? rootDir : undefined;
}

export const detectCircularImportsPlugin: Plugin = {
  name: "detect-circular-imports",
  setup(build) {
    build.onStart(async () => {
      const entryPoints = getEntryPointPaths(build.initialOptions.entryPoints);

      if (entryPoints.length === 0) return;

      const cwd =
        build.initialOptions.absWorkingDir ??
        findNearestTsconfigDir(entryPoints[0]) ??
        process.cwd();
      const tsconfig = existsSync(resolve(cwd, "tsconfig.json")) ? "tsconfig.json" : undefined;
      const tree = await parseDependencyTree(entryPoints, {
        cwd,
        context: cwd,
        tsconfig,
        transform: true,
        skipDynamicImports: true,
      });
      const circulars = parseCircular(tree);

      if (circulars.length === 0) return;

      const errors: PartialMessage[] = [
        {
          text: [
            `Circular imports detected (${circulars.length}):`,
            prettyCircular(circulars, "  "),
          ].join("\n"),
        },
      ];

      return { errors };
    });
  },
};
