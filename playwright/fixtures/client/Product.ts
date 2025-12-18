import { ApiProductVariant } from '@codegen/client-gql';
import { ClientApiFixture } from '@fixtures/client/api';

export class Product {
  constructor(private api: ClientApiFixture) {}

  async get(handle: string) {
    const { data } = await this.api.query('client/Product', {
      variables: { handle },
    });

    return data?.product as ApiProductVariant;
  }
}
