import { dumbo } from '@event-driven-io/dumbo';
import { getServiceConfig, buildDatabaseUrl } from "@shopana/shared-service-config";

const { service } = getServiceConfig("orders");

export const dumboPool = dumbo({ connectionString: service.db ? buildDatabaseUrl(service.db) : "" });
