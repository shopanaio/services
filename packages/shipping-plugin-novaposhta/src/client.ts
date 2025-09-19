import type { HttpClient } from '@shopana/shipping-plugin-kit';
import type { GetDocumentPriceResp } from './schemas';

export class NovaPoshtaClient {
  constructor(
    private readonly http: HttpClient,
    private readonly apiKey: string,
  ) {}

  private async call<T>(modelName: string, calledMethod: string, methodProperties: Record<string, unknown>): Promise<T> {
    const body = { apiKey: this.apiKey, modelName, calledMethod, methodProperties };
    const res = await this.http.post('/', body);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    if ((data as any)?.errors && Array.isArray((data as any).errors) && (data as any).errors.length > 0) {
      throw new Error(`Nova Poshta API error: ${(data as any).errors.join(', ')}`);
    }
    return data as T;
  }

  async getDocumentPrice(props: {
    CitySender: string;
    CityRecipient: string;
    Weight: number;
    ServiceType: string;
    Cost: number;
    CargoType?: string;
  }): Promise<GetDocumentPriceResp> {
    return this.call<GetDocumentPriceResp>('InternetDocument', 'getDocumentPrice', props);
  }
}
