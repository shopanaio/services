import { ServiceBroker } from "moleculer";
import PaymentsService from "./service";

const broker = new ServiceBroker({
  logger: true,
  transporter: undefined,
});

broker.createService(PaymentsService as any);

broker.start();
