import type { Repository } from "../repositories/index.js";
import { FileLoader } from "./FileLoader.js";
import { S3ObjectLoader } from "./S3ObjectLoader.js";
import { ExternalMediaLoader } from "./ExternalMediaLoader.js";
import { FileUsageLoader } from "./FileUsageLoader.js";

/**
 * Loader - aggregates all data loaders for Media service
 * Create new instance per request for proper batching
 */
export class Loader {
  public readonly file: FileLoader["file"];
  public readonly fileUsage: FileUsageLoader["usage"];
  public readonly s3Object: S3ObjectLoader["s3Object"];
  public readonly externalMedia: ExternalMediaLoader["externalMedia"];

  constructor(repository: Repository) {
    const fileLoader = new FileLoader(repository);
    const fileUsageLoader = new FileUsageLoader(repository);
    const s3ObjectLoader = new S3ObjectLoader(repository);
    const externalMediaLoader = new ExternalMediaLoader(repository);

    this.file = fileLoader.file;
    this.fileUsage = fileUsageLoader.usage;
    this.s3Object = s3ObjectLoader.s3Object;
    this.externalMedia = externalMediaLoader.externalMedia;
  }
}
