import { createReadStream } from 'node:fs';

import { FacebookFeedReader } from '../types';

export class FileFacebookFeedReader implements FacebookFeedReader {
  private readonly filePath: string;

  public constructor(filePath: string) {
    this.filePath = filePath;
  }

  public async stream(): Promise<NodeJS.ReadableStream> {
    return createReadStream(this.filePath, { encoding: 'utf-8' });
  }
}
