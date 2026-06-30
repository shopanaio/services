import type { TenantApiFixture } from '@fixtures/admin/api';
import type { GraphQLFileName } from '@queries/filenames';

export class Search {
  constructor(private api: TenantApiFixture) {}

  /* ===== Keyword Groups ===== */
  async keywordGroupCreate(input: { title: string }): Promise<string> {
    const { data } = await this.api.mutation('admin/KeywordGroupCreate' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.keywordGroupCreate as string;
  }

  async keywordGroupUpdate(input: { id: string; title: string }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/KeywordGroupUpdate' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.keywordGroupUpdate as boolean;
  }

  async keywordGroupDelete(input: { id: string }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/KeywordGroupDelete' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.keywordGroupDelete as boolean;
  }

  /* ===== Keywords ===== */
  async keywordCreate(input: { groupId: string; keyword: string; localeCode: string }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/KeywordCreate' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.keywordCreate as boolean;
  }

  async keywordDelete(input: { groupId: string; keyword: string; localeCode: string }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/KeywordDelete' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.keywordDelete as boolean;
  }

  /* ===== Linking to products ===== */
  async linkGroupToProduct(input: { groupId: string; productId: string }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/LinkGroupToProduct' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.linkGroupToProduct as boolean;
  }

  async unlinkGroupFromProduct(input: { groupId: string; productId: string }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/UnlinkGroupFromProduct' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.unlinkGroupFromProduct as boolean;
  }

  /* ===== Synonyms ===== */
  async synonymUpsert(input: { term: string; synonym: string; localeCode: string; weight: number }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/SynonymUpsert' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.synonymUpsert as boolean;
  }

  async synonymDelete(input: { term: string; synonym: string; localeCode: string }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/SynonymDelete' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.synonymDelete as boolean;
  }

  /* ===== Stop-words ===== */
  async stopWordSet(input: { word: string; localeCode: string; isActive: boolean }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/StopWordSet' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.stopWordSet as boolean;
  }

  /* ===== Language Config ===== */
  async languageConfigUpsert(input: { localeCode: string; tsConfig: string; description?: string }): Promise<boolean> {
    const { data } = await this.api.mutation('admin/LanguageConfigUpsert' as GraphQLFileName, {
      variables: { input },
    });
    // @ts-expect-error -- dynamic GraphQL response, not typed in codegen
    return data.searchMutation.languageConfigUpsert as boolean;
  }
}
