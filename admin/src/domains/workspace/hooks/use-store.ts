"use client";

import { useFragment } from "@apollo/client/react";
import type { ApiStore } from "@/graphql/types";
import { usePathParams } from "@/registry";
import { CURRENT_STORE_FRAGMENT } from "../graphql";

export function useStore(): ApiStore | null {
  const pathParams = usePathParams();
  const storeName = pathParams.getParam("storeName");

  const storeFragment = useFragment<ApiStore>({
    fragment: CURRENT_STORE_FRAGMENT,
    fragmentName: "CurrentStoreFields",
    from: storeName ? { __typename: "Store", name: storeName } : null,
  });

  return storeFragment.complete ? (storeFragment.data as ApiStore) : null;
}
