import { createHash } from 'node:crypto';
import { parse } from 'csv-parse';

import { FacebookFeedReader, FacebookFeedRecord } from './types';

export class FacebookFeedHashParser {
  private readonly delimiter: string;

  public constructor(delimiter = ';') {
    this.delimiter = delimiter;
  }

  /**
   * Streams feed records from the reader and yields each item with a stable hash.
   */
  public async *parse(reader: FacebookFeedReader): AsyncGenerator<FacebookFeedRecord> {
    const source = await reader.stream();
    const parser = parse({
      bom: true,
      delimiter: this.delimiter,
      relax_quotes: true,
      skip_empty_lines: true,
    });

    source.on('error', (error) => {
      parser.destroy(error);
    });

    const pipeline = source.pipe(parser);
    let headers: string[] | null = null;
    const seenIds = new Set<string>();

    for await (const row of pipeline) {
      const columns = row as string[];

      if (!headers) {
        headers = columns.map((value) => value.trim());
        continue;
      }

      if (this.isRowEmpty(columns)) {
        continue;
      }

      const record = this.createRecord(headers, columns);
      const { id } = record;
      if (!id) {
        throw new Error('CSV row is missing required id column');
      }

      if (seenIds.has(id)) {
        throw new Error(`Duplicate id encountered in feed: ${id}`);
      }

      const hash = this.computeHash(headers, record);
      seenIds.add(id);

      yield {
        id,
        values: record,
        hash,
      };
    }

    if (!headers) {
      throw new Error('CSV feed is missing header row');
    }
  }

  /**
   * Collects feed hashes into memory. Prefer iterating with parse() for large datasets.
   */
  public async parseToHashMap(reader: FacebookFeedReader): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for await (const record of this.parse(reader)) {
      map.set(record.id, record.hash);
    }
    return map;
  }

  private isRowEmpty(row: string[]): boolean {
    return row.every((value) => value.trim().length === 0);
  }

  private createRecord(headers: string[], row: string[]): Record<string, string> {
    const values: Record<string, string> = {};
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      values[header] = row[index] ?? '';
    }
    return values;
  }

  private computeHash(headers: string[], values: Record<string, string>): string {
    const hash = createHash('sha256');
    for (const header of headers) {
      hash.update(header);
      hash.update('\u241F');
      hash.update(values[header] ?? '');
      hash.update('\u241E');
    }
    return hash.digest('hex');
  }
}
