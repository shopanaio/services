// Type declarations for webpack's require.context
interface RequireContext {
  keys(): string[];
  (id: string): unknown;
  <T>(id: string): T;
  resolve(id: string): string;
  id: string;
}

interface Require {
  context(
    directory: string,
    useSubdirectories?: boolean,
    regExp?: RegExp
  ): RequireContext;
}

declare const require: Require;
