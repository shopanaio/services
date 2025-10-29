import { plugin as tildaPlugin } from "./plugin";

export { FacebookFeedHashParser } from "./facebook-feed-hash-parser";
export { FileFacebookFeedReader, UrlFacebookFeedReader } from "./readers";
export { plugin } from "./plugin";
export { configSchema } from "./config";
export { TildaImportProvider } from "./provider";
export type {
  FacebookFeedReader,
  FacebookFeedRecord,
} from "./types";
export type {
  TildaFeedConfig,
  TildaStorageConfig,
  TildaImportConfig,
} from "./config";
export type {
  ListFeedRecordsInput,
  CreateInventoryUpdateTaskInput,
  TildaFeedRecord,
  TildaFeedSourceOverride,
} from "./provider";

export default { plugin: tildaPlugin };
