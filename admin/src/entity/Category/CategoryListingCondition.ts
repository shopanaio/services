export class CategoryListingCondition {
  static create(data: any) {
    try {
      return {
        createdAt: data.createdAt,
        entry: data.entry,
        id: data.id,
        operator: data.operator,
        path: data.path,
        type: data.type,
        updatedAt: data.updatedAt,
        value: data.value,
      };
    } catch (e) {
      console.error('CategoryListingCondition construction failed');
      return null;
    }
  }
}
