const fs = require('fs');
const path = require('path');
const { Compilation } = require('webpack');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const template = require('@babel/template').default;

const t = require('@babel/types');

class LazyIconsWebpackPlugin {
  constructor(options) {
    this.outputDir = options.outputDir || 'lazyIcons';
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'LazyIconsWebpackPlugin',
      (compilation) => {
        compilation.hooks.processAssets.tap(
          {
            name: 'LazyIconsWebpackPlugin',
            stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
          },
          (assets) => {
            for (const assetName in assets) {
              if (assetName.endsWith('.js')) {
                const asset = compilation.getAsset(assetName);
                const { source } = asset;
                const transformedSource = this.transformSource(source.source());
                compilation.updateAsset(
                  assetName,
                  new sources.RawSource(transformedSource),
                );
              }
            }
          },
        );
      },
    );
  }

  transformSource(source) {
    const ast = parse(source, {
      sourceType: 'module',
      plugins: ['jsx'],
    });

    traverse(ast, {
      ImportDeclaration(path) {
        if (path.node.source.value.startsWith('react-icons/')) {
          const iconImports = path.node.specifiers.map((specifier) => {
            const iconName = specifier.local.name;
            return template.statement.ast(`
              const ${iconName} = React.lazy(() => import('${path.node.source.value}').then(module => ({ default: module.${iconName} })));
            `);
          });

          path.replaceWithMultiple(iconImports);
        }
      },
    });

    const { code } = generate(ast);
    return code;
  }
}

module.exports = LazyIconsWebpackPlugin;
