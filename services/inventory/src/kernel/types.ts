/**
 * Logger interface for the inventory service
 */
export interface Logger {
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

/**
 * Plugin Manager interface for the inventory service
 */
export interface PluginManager {
  getOffers(params: {
    pluginCode: string;
    input: any;
    requestMeta?: { requestId?: string; userAgent?: string };
    projectId?: string;
  }): Promise<any[]>;
}
