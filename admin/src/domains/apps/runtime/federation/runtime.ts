import * as React from "react";
import * as ReactDom from "react-dom";
import * as Antd from "antd";
import * as AntdStyle from "antd-style";
import * as AntdCssInJs from "@ant-design/cssinjs";
import * as ApolloClient from "@apollo/client";
import * as AgGridReact from "ag-grid-react";
import * as AgGridCommunity from "ag-grid-community";
import type { ModuleFederation } from "@module-federation/enhanced/runtime";

let runtimePromise: Promise<ModuleFederation> | null = null;

const shared = (
  version: string,
  module: Record<string, unknown>,
): {
  version: string;
  scope: string;
  lib: () => Record<string, unknown>;
  shareConfig: { singleton: true; requiredVersion: string };
} => ({
  version,
  scope: "default",
  lib: () => module,
  shareConfig: { singleton: true, requiredVersion: version },
});

export function getFederationRuntime(): Promise<ModuleFederation> {
  if (!runtimePromise) {
    runtimePromise = import("@module-federation/enhanced/runtime").then(
      ({ createInstance }) =>
        createInstance({
          name: "shopana_admin_host",
          remotes: [],
          shared: {
            react: shared("19.2.0", React),
            "react-dom": shared("19.2.0", ReactDom),
            antd: shared("6.0.1", Antd),
            "antd-style": shared("3.7.1", AntdStyle),
            "@ant-design/cssinjs": shared("2.0.1", AntdCssInJs),
            "@apollo/client": shared("4.0.12", ApolloClient),
            "ag-grid-react": shared("34.3.1", AgGridReact),
            "ag-grid-community": shared("34.3.1", AgGridCommunity),
          },
        }),
    );
  }
  return runtimePromise;
}

