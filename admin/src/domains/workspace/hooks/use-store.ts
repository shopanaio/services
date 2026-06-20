"use client";

import { useFragment } from "@apollo/client/react";
import type { ApiStore } from "@/graphql/types";
import { usePathParams } from "@/registry";
import { STORE_FRAGMENT } from "../graphql";

export function useStore(): ApiStore | null {
  const pathParams = usePathParams();
  const storeName = pathParams.getParam("storeName");

  const storeFragment = useFragment<ApiStore>({
    fragment: STORE_FRAGMENT,
    fragmentName: "StoreFields",
    from: storeName ? { __typename: "Store", name: storeName } : null,
  });

  return storeFragment.complete ? (storeFragment.data as ApiStore) : null;
}
