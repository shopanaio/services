/**
 * Shared modules context for both server and client.
 * This ensures modules are registered on both environments.
 */
export const modulesContext = require.context(
  "../domains",
  true,
  /(register|domain)\.tsx?$/
);
