export interface FacebookFeedRecord {
  id: string;
  values: Record<string, string>;
  hash: string;
}

/**
 * Provides a readable stream with CSV content for parser consumption.
 */
export interface FacebookFeedReader {
  stream(): Promise<NodeJS.ReadableStream>;
}
