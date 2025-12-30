import type { Repository } from "../repositories/index.js";
import { FileLoader } from "./FileLoader.js";
import { S3ObjectLoader } from "./S3ObjectLoader.js";
import { ExternalMediaLoader } from "./ExternalMediaLoader.js";

/**
 * Loader - aggregates all data loaders for Media service
 * Create new instance per request for proper batching
 */
export class Loader {
  public readonly file: FileLoader["file"];
  public readonly s3Object: S3ObjectLoader["s3Object"];
  public readonly externalMedia: ExternalMediaLoader["externalMedia"];

  constructor(projectId: string, repository: Repository) {
    const fileLoader = new FileLoader(projectId, repository);
    const s3ObjectLoader = new S3ObjectLoader(projectId, repository);
    const externalMediaLoader = new ExternalMediaLoader(projectId, repository);

    this.file = fileLoader.file;
    this.s3Object = s3ObjectLoader.s3Object;
    this.externalMedia = externalMediaLoader.externalMedia;
  }
}
