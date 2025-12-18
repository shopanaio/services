import { APIRequestContext } from '@playwright/test';
import { BaseGqlRequest, GqlRequestSession } from '@fixtures/api/gqlRequest';
import { Cart } from '../client/Cart';
import { Auth } from '../client/Auth';
import { Product } from './Product';
import { ApiQuery, ApiMutation } from '@codegen/client-gql';
import { Review } from './Review';
import { Checkout } from './Checkout';
import { Order } from './Order';
import { CheckoutApiFixture } from '@fixtures/checkout/api';
import { Variant } from './Variant';

class ClientGqlRequest extends BaseGqlRequest<ApiQuery, ApiMutation> {
  constructor(request: APIRequestContext, session: GqlRequestSession) {
    const graphqlUrl = process.env.CLIENT_GRAPHQL_URL;
    if (!graphqlUrl) {
      throw new Error('CLIENT_GRAPHQL_URL environment variable is not set');
    }
    super(request, graphqlUrl, session);
  }
}

export class ClientApiFixture extends ClientGqlRequest {
  cart: Cart;
  auth: Auth;
  product: Product;
  review: Review;
  checkout: Checkout;
  order: Order;
  variant: Variant;

  constructor({
    request,
    session,
  }: {
    request: APIRequestContext;
    session: GqlRequestSession;
    checkoutApi: CheckoutApiFixture;
  }) {
    super(request, session);

    this.cart = new Cart(this);
    this.auth = new Auth(this);
    this.product = new Product(this);
    this.review = new Review(this);
    this.checkout = new Checkout(this);
    this.order = new Order(this);
    this.variant = new Variant(this);
  }
}
