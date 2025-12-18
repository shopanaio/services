import type { CasdoorApiResponse, CasdoorHttpResult, RequestContext } from "../types/api.js";
import { CasdoorHttpClient } from "../http/httpClient.js";

export class FaceIdModule {
  constructor(private readonly http: CasdoorHttpClient) {}

  signinBegin(
    ctx: RequestContext,
    values: { owner: string; name: string },
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({ owner: values.owner, name: values.name });
    return this.http.get(ctx, `/api/faceid-signin-begin?${params.toString()}`);
  }
}

