import type { BaseGqlRequest, GqlRequestSession } from '@fixtures/api/gqlRequest';
import { readQuery } from '@fixtures/api/types';
import type { APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

export type FileProvider = 'S3' | 'YOUTUBE' | 'VIMEO' | 'URL';

export interface FileResult {
  id: string;
  url: string;
  mimeType?: string;
  ext?: string;
  sizeBytes?: string;
  originalName?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface CreateExternalInput {
  provider: FileProvider;
  externalId: string;
  url: string;
  thumbnailUrl?: string;
  originalName?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  altText?: string;
  providerMeta?: Record<string, unknown>;
}

export class FileFixture {
  private readonly graphqlUrl: string;

  constructor(
    private request: APIRequestContext,
    private session: GqlRequestSession,
    private gql: BaseGqlRequest<unknown, unknown>,
  ) {
    const graphqlUrl = process.env.ADMIN_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('ADMIN_GRAPHQL_URL environment variable is not set');
    }
    this.graphqlUrl = graphqlUrl;
  }

  /**
   * Upload a local file via GraphQL multipart mutation.
   * This is the primary method for uploading files from disk.
   */
  async uploadFile(filePath: string, altText?: string): Promise<FileResult> {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const fileName = path.basename(absolutePath);
    const mimeType = this.getMimeType(fileName);

    // Build multipart request according to GraphQL multipart spec
    // https://github.com/jaydenseric/graphql-multipart-request-spec
    const query = readQuery('media-api/FileUpload');

    const operations = JSON.stringify({
      query,
      variables: {
        input: {
          file: null, // Will be replaced by file from map
          altText,
        },
      },
    });

    const map = JSON.stringify({
      '0': ['variables.input.file'],
    });

    // Create form data
    const formData = new FormData();
    formData.append('operations', operations);
    formData.append('map', map);
    formData.append('0', fileBuffer, {
      filename: fileName,
      contentType: mimeType,
    });

    const { projectSlug, accessToken } = this.session;

    const response = await this.request.post(this.graphqlUrl, {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(projectSlug ? { 'X-Store-Name': projectSlug } : {}),
        'apollo-require-preflight': 'true',
        ...formData.getHeaders(),
      },
      data: formData.getBuffer(),
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Upload failed: ${response.status()} ${text}`);
    }

    const json = await response.json();

    if (json.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    const file = json.data?.mediaMutation?.fileUpload?.file;
    const userErrors = json.data?.mediaMutation?.fileUpload?.userErrors;

    if (userErrors?.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(userErrors)}`);
    }

    if (!file?.id) {
      throw new Error(`Failed to upload file: ${JSON.stringify(json)}`);
    }

    return this.mapFileResult(file);
  }

  /**
   * Upload a file from a remote URL.
   * The server will download the file and store it in S3.
   */
  async uploadFromUrl(sourceUrl: string, altText?: string): Promise<FileResult> {
    const { data } = await this.gql.mutation('media-api/FileUploadFromUrl', {
      variables: {
        input: { sourceUrl, altText },
      },
    });

    const result = (data as Record<string, unknown>).mediaMutation as Record<string, unknown>;
    const fileUploadFromUrl = result?.fileUploadFromUrl as Record<string, unknown>;
    const file = fileUploadFromUrl?.file as Record<string, unknown>;
    const userErrors = fileUploadFromUrl?.userErrors as unknown[];

    if (userErrors?.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(userErrors)}`);
    }

    if (!file?.id) {
      throw new Error('Failed to upload file from URL');
    }

    return this.mapFileResult(file);
  }

  /**
   * Create an external media reference (YouTube, Vimeo, etc).
   * No file is uploaded - just a reference to external content.
   */
  async createExternal(input: CreateExternalInput): Promise<FileResult> {
    const { data } = await this.gql.mutation('media-api/FileCreateExternal', {
      variables: { input },
    });

    const result = (data as Record<string, unknown>).mediaMutation as Record<string, unknown>;
    const fileCreateExternal = result?.fileCreateExternal as Record<string, unknown>;
    const file = fileCreateExternal?.file as Record<string, unknown>;
    const userErrors = fileCreateExternal?.userErrors as unknown[];

    if (userErrors?.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(userErrors)}`);
    }

    if (!file?.id) {
      throw new Error('Failed to create external file');
    }

    return this.mapFileResult(file);
  }

  /**
   * Helper to create a YouTube video reference.
   */
  async createYouTubeVideo(
    videoId: string,
    options?: { title?: string; altText?: string },
  ): Promise<FileResult> {
    return this.createExternal({
      provider: 'YOUTUBE',
      externalId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      originalName: options?.title,
      altText: options?.altText,
    });
  }

  /**
   * Helper to create a Vimeo video reference.
   */
  async createVimeoVideo(
    videoId: string,
    options?: { title?: string; altText?: string; thumbnailUrl?: string },
  ): Promise<FileResult> {
    return this.createExternal({
      provider: 'VIMEO',
      externalId: videoId,
      url: `https://vimeo.com/${videoId}`,
      thumbnailUrl: options?.thumbnailUrl,
      originalName: options?.title,
      altText: options?.altText,
    });
  }

  private mapFileResult(file: Record<string, unknown>): FileResult {
    return {
      id: file.id as string,
      url: file.url as string,
      mimeType: file.mimeType as string | undefined,
      ext: file.ext as string | undefined,
      sizeBytes: file.sizeBytes as string | undefined,
      originalName: file.originalName as string | undefined,
      width: (file.dimensions as { width?: number })?.width,
      height: (file.dimensions as { height?: number })?.height,
      durationMs: file.durationMs as number | undefined,
    };
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
