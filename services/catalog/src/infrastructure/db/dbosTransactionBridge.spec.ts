import { describe, expect, it } from "@jest/globals";
import type { DatabaseConnectionOptions } from "@shopana/shared-kernel";
import {
  CATALOG_DBOS_DATASOURCE_POOL_MAX,
  createCatalogDbosDataSourceOptions,
} from "./dbosTransactionBridge.js";

describe("Catalog DBOS datasource options", () => {
  it("uses an immutable pool budget independent from the shared pool", () => {
    const sharedOptions: DatabaseConnectionOptions = Object.freeze({
      host: "database.internal",
      port: 5432,
      username: "shopana",
      password: "secret",
      database: "portal",
      max: 30,
      idle_timeout: 20,
      connect_timeout: 30,
      max_lifetime: 1_800,
    });

    const options = createCatalogDbosDataSourceOptions(sharedOptions);

    expect(options.max).toBe(CATALOG_DBOS_DATASOURCE_POOL_MAX);
    expect(options.max).toBe(2);
    expect(options.max).not.toBe(sharedOptions.max);
    expect(Object.isFrozen(options)).toBe(true);
    expect(options).toMatchObject({
      host: sharedOptions.host,
      port: sharedOptions.port,
      username: sharedOptions.username,
      password: sharedOptions.password,
      database: sharedOptions.database,
    });
  });
});
