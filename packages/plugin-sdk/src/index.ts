/**
 * Public re-export of plugin core modules.
 * Use import from `@plugin-core` to access stable API.
 */
export * from './runner';
export * from './httpClient';
export * from './secrets';
export * from './registry';
export * from './pluginManager';
export * from './providerContext';
export * from './types';
export * from './utils/manifest';

// Domain re-exports (opt-in by subpath preferable, but also available here for convenience)
export * as shipping from './shipping';
export * as payment from './payment';
export * as pricing from './pricing';
export * as inventory from './inventory';
