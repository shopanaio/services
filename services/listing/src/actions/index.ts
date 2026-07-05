import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";

@Injectable()
export class ListingBrokerActions extends BrokerActions {
  constructor(@InjectBroker("listing") broker: ServiceBroker) {
    super(broker);
  }
}
