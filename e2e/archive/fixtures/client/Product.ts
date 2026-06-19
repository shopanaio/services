import type { ApiProductVariant } from '@codegen/client-gql';
import type { ClientApiFixture } from '@fixtures/client/api';

export class Product {
  constructor(private api: ClientApiFixture) {}

  async get(handle: string) {
    const { data } = await this.api.query('client/Product', {
      variables: { handle },
    });

    return data?.product as ApiProductVariant;
  }
}
