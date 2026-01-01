const path = require('path');

exports.resolveTsAliases = () => {
  const tsconfig = require(path.resolve(process.cwd(), 'tsconfig.json'));

  return Object.entries(tsconfig.compilerOptions.paths).reduce(
    (acc, [key, value]) => {
      const aliasName = key.replace('/*', '');
      const aliasPath = path.resolve(process.cwd(), value[0].replace('/*', ''));
      const aliases = { ...acc, [aliasName]: aliasPath };
      return aliases;
    },
    {},
  );
};
