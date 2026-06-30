import type { ApiProductVariant } from '@codegen/client-gql';
import type { ClientApiFixture } from '@fixtures/client/api';

export class Variant {
  constructor(private api: ClientApiFixture) {}

  async get(handle: string) {
    const { data } = await this.api.query('client/Variant', {
      variables: { handle },
    });

    return data?.variant as ApiProductVariant;
  }
}
