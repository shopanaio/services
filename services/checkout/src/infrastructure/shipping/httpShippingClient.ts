import type { ShippingPort, ShippingMethodDto } from "@src/application/ports/shippingPort";

export class HttpShippingClient implements ShippingPort {
  constructor(private readonly baseUrl: string) {}

  async getProjectMethods(input: {
    projectId: string;
    apiKey: string;
  }): Promise<ShippingMethodDto[]> {
    const resp = await fetch(`${this.baseUrl}/shipping-methods`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'x-project-id': input.projectId,
      },
    });

    if (!resp.ok) {
      throw new Error(`Shipping service responded ${resp.status}`);
    }

    const data = await resp.json();
    return (data.methods || []) as ShippingMethodDto[];
  }
}
