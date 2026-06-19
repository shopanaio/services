import type {
  ApiAddCartLineInput,
  ApiUpdateCartLineQuantityInput,
  ApiCreateCartInput,
  ApiRemoveCartLineInput,
  ApiClearCartLinesInput,
  ApiLoadCartInput,
} from '@codegen/client-gql';
import type { ClientApiFixture } from '@fixtures/client/api';

export class Cart {
  constructor(private api: ClientApiFixture) {}

  async create(input: ApiCreateCartInput) {
    return this.api.mutation('client/CreateCart', {
      variables: { input },
    });
  }

  async addLine(input: ApiAddCartLineInput) {
    return this.api.mutation('client/AddCartLine', {
      variables: { input },
    });
  }

  async updateLineQuantity(input: ApiUpdateCartLineQuantityInput) {
    return this.api.mutation('client/UpdateCartLineQuantity', {
      variables: { input },
    });
  }

  async removeLine(input: ApiRemoveCartLineInput) {
    return this.api.mutation('client/RemoveCartLine', {
      variables: { input },
    });
  }

  async clearLines(input: ApiClearCartLinesInput) {
    return this.api.mutation('client/ClearCartLines', {
      variables: { input },
    });
  }

  async load(input: ApiLoadCartInput) {
    return this.api.mutation('client/LoadCart', {
      variables: { input },
    });
  }
}
