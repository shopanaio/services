import type { HttpClient } from '@shopana/shipping-plugin-sdk';

export class MeestExpressClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKey: string,
  ) {}

  private async call<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await this.http.post(path, { apiKey: this.apiKey, ...body });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  async getRates(props: {
    senderCity: string;
    recipientCity: string;
    weightKg: number;
    serviceType: string;
    declaredCost: number;
  }): Promise<unknown> {
    return this.call<unknown>('/rates', props);
  }
}
