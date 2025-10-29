import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { FacebookFeedHashParser } from '../facebook-feed-hash-parser';
import { FileFacebookFeedReader, UrlFacebookFeedReader } from '../readers';
import type { FacebookFeedRecord } from '../types';

const feedPath = resolve(__dirname, '../feed-fb.csv');

describe('FacebookFeedHashParser', () => {
  it('парсит CSV фид и вычисляет стабильные хеши', async () => {
    const parser = new FacebookFeedHashParser();
    const reader = new FileFacebookFeedReader(feedPath);

    const records: FacebookFeedRecord[] = [];
    for await (const record of parser.parse(reader)) {
      records.push(record);
    }

    expect(records).toHaveLength(26);

    const firstRecord = records.find((item) => item.id === '438046752511');
    expect(firstRecord?.hash).toBe('a5823a45411ac62563f741c7a0046758df8092c6fd6cabd1b0ca36e8ea7d2492');

    const lastRecord = records.find((item) => item.id === '282236170171');
    expect(lastRecord?.hash).toBe('0aaf521fb5cffa8cff82938d4f50c5bd49e7e0a57090d01ebdc47927d3fc6380');
  });
  it('парсит CSV фид по HTTP, не буферизуя весь ответ', async () => {
    const server = createServer((request, response) => {
      response.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
      createReadStream(feedPath).pipe(response);
    });

    const address = await new Promise<AddressInfo>((resolveAddress, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const serverAddress = server.address();
        if (!serverAddress || typeof serverAddress === 'string') {
          reject(new Error('Unexpected server address'));
          return;
        }
        resolveAddress(serverAddress);
      });
    });

    const parser = new FacebookFeedHashParser();
    const reader = new UrlFacebookFeedReader(`http://127.0.0.1:${address.port}/feed`);

    try {
      const records: FacebookFeedRecord[] = [];
      for await (const record of parser.parse(reader)) {
        records.push(record);
      }

      expect(records).toHaveLength(26);
      expect(records[0]?.hash).toBe('a5823a45411ac62563f741c7a0046758df8092c6fd6cabd1b0ca36e8ea7d2492');
    } finally {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) {
            rejectClose(error);
            return;
          }
          resolveClose();
        });
      });
    }
  });
});
