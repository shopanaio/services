import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

import { FacebookFeedReader } from '../types';

export class UrlFacebookFeedReader implements FacebookFeedReader {
  private readonly url: string;

  public constructor(url: string) {
    this.url = url;
  }

  public async stream(): Promise<NodeJS.ReadableStream> {
    const urlInstance = new URL(this.url);
    const requester = urlInstance.protocol === 'https:' ? httpsRequest : httpRequest;

    return new Promise<NodeJS.ReadableStream>((resolve, reject) => {
      const request = requester(urlInstance, (response) => {
        if (!response.statusCode) {
          reject(new Error('Failed to fetch feed: missing status code'));
          return;
        }

        if (response.statusCode >= 400) {
          reject(new Error(`Failed to fetch feed: ${response.statusCode} ${response.statusMessage ?? ''}`.trim()));
          return;
        }

        response.setEncoding('utf-8');
        resolve(response);
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.end();
    });
  }
}
