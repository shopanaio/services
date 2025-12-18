import type { CasdoorApiResponse, CasdoorHttpResult, RequestContext } from "../types/api.js";
import { CasdoorHttpClient } from "../http/httpClient.js";

export class InvitationModule {
  constructor(private readonly http: CasdoorHttpClient) {}

  getInvitationInfo(
    ctx: RequestContext,
    values: { code: string; applicationId: string },
  ): Promise<CasdoorHttpResult<CasdoorApiResponse>> {
    const params = new URLSearchParams({ code: values.code, applicationId: values.applicationId });
    return this.http.get(ctx, `/api/get-invitation-info?${params.toString()}`);
  }
}

