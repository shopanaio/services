import { ApiCreateOrderInput } from '@codegen/client-gql';
import { ClientApiFixture } from '@fixtures/client/api';

export class Order {
  constructor(private client: ClientApiFixture) {}

  async create(input: ApiCreateOrderInput) {
    return this.client.mutation('client/OrderCreate', {
      variables: { input },
    });
  }
}
