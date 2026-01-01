export interface IEntryOption {
  id: number;
  title?: string;
  slug?: string;
  color?: string;
}

export class EntryOption {
  static create(entry: any) {
    return {
      id: entry.id,
      title: entry?.title,
      slug: entry.slug,
      color: entry.color,
    };
  }
}
