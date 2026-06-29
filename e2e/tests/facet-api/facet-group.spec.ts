import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('FacetGroup API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - CREATE
  // ═══════════════════════════════════════

  test('should create facet group with minimal input', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: {
        input: {
          name: 'Test Group',
        },
      },
    });

    const result = data.catalogMutation.facetGroupCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetGroup).toBeTruthy();
    expect(result.facetGroup?.name).toBe('Test Group');
    expect(result.facetGroup?.sortIndex).toBe(0);
  });

  test('should create facet group with all optional fields', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: {
        input: {
          name: 'Full Group',
          sortIndex: 5,
        },
      },
    });

    const result = data.catalogMutation.facetGroupCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetGroup).toBeTruthy();
    expect(result.facetGroup?.name).toBe('Full Group');
    expect(result.facetGroup?.sortIndex).toBe(5);
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - UPDATE
  // ═══════════════════════════════════════

  test('should update facet group name', async ({ api }) => {
    // Create a group first
    const { data: createData } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: {
        input: { name: 'Original Name' },
      },
    });

    const groupId = createData.catalogMutation.facetGroupCreate.facetGroup?.id;
    expect(groupId).toBeTruthy();

    // Update the group
    const { data } = await api.admin.mutation('facet-api/FacetGroupUpdate', {
      variables: {
        input: {
          id: groupId,
          name: 'Updated Name',
        },
      },
    });

    const result = data.catalogMutation.facetGroupUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetGroup).toBeTruthy();
    expect(result.facetGroup?.name).toBe('Updated Name');
  });

  test('should update facet group sortIndex', async ({ api }) => {
    // Create a group first
    const { data: createData } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: {
        input: { name: 'Test Group', sortIndex: 0 },
      },
    });

    const groupId = createData.catalogMutation.facetGroupCreate.facetGroup?.id;
    expect(groupId).toBeTruthy();

    // Update the group
    const { data } = await api.admin.mutation('facet-api/FacetGroupUpdate', {
      variables: {
        input: {
          id: groupId,
          sortIndex: 10,
        },
      },
    });

    const result = data.catalogMutation.facetGroupUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetGroup).toBeTruthy();
    expect(result.facetGroup?.sortIndex).toBe(10);
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - DELETE
  // ═══════════════════════════════════════

  test('should delete facet group', async ({ api }) => {
    // Create a group first
    const { data: createData } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: {
        input: { name: 'Group to Delete' },
      },
    });

    const groupId = createData.catalogMutation.facetGroupCreate.facetGroup?.id;
    expect(groupId).toBeTruthy();

    // Delete the group
    const { data } = await api.admin.mutation('facet-api/FacetGroupDelete', {
      variables: {
        input: { id: groupId },
      },
    });

    const result = data.catalogMutation.facetGroupDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedFacetGroupId).toBe(groupId);

    // Verify deletion
    const { data: queryData } = await api.admin.query('facet-api/FacetGroup', {
      variables: { id: groupId },
    });

    expect(queryData.catalogQuery.facetGroup).toBeNull();
  });

  // ═══════════════════════════════════════
  // HAPPY PATH - QUERIES
  // ═══════════════════════════════════════

  test('should list all facet groups', async ({ api }) => {
    // Create multiple groups
    await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: { input: { name: 'Group A', sortIndex: 1 } },
    });
    await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: { input: { name: 'Group B', sortIndex: 2 } },
    });

    const { data } = await api.admin.query('facet-api/FacetGroups', {});

    expect(data.catalogQuery.facetGroups).toBeTruthy();
    expect(data.catalogQuery.facetGroups.length).toBeGreaterThanOrEqual(2);

    const names = data.catalogQuery.facetGroups.map((g: { name: string }) => g.name);
    expect(names).toContain('Group A');
    expect(names).toContain('Group B');
  });

  test('should get single facet group by ID', async ({ api }) => {
    // Create a group
    const { data: createData } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: {
        input: { name: 'Query Test Group', sortIndex: 3 },
      },
    });

    const groupId = createData.catalogMutation.facetGroupCreate.facetGroup?.id;
    expect(groupId).toBeTruthy();

    // Query the group
    const { data } = await api.admin.query('facet-api/FacetGroup', {
      variables: { id: groupId },
    });

    expect(data.catalogQuery.facetGroup).toBeTruthy();
    expect(data.catalogQuery.facetGroup?.id).toBe(groupId);
    expect(data.catalogQuery.facetGroup?.name).toBe('Query Test Group');
    expect(data.catalogQuery.facetGroup?.sortIndex).toBe(3);
  });

  // ═══════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════

  test('should reject empty name', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      throwOnError: false,
      variables: {
        input: { name: '' },
      },
    });

    const result = data.catalogMutation.facetGroupCreate;

    expect(result.facetGroup).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject update with non-existent ID', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetGroupUpdate', {
      throwOnError: false,
      variables: {
        input: {
          id: 'non-existent-id',
          name: 'New Name',
        },
      },
    });

    const result = data.catalogMutation.facetGroupUpdate;

    expect(result.facetGroup).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject delete with non-existent ID', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetGroupDelete', {
      throwOnError: false,
      variables: {
        input: { id: 'non-existent-id' },
      },
    });

    const result = data.catalogMutation.facetGroupDelete;

    expect(result.deletedFacetGroupId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle special characters in name', async ({ api }) => {
    const specialName = 'Test & Group <with> "special" chars!';

    const { data } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: {
        input: { name: specialName },
      },
    });

    const result = data.catalogMutation.facetGroupCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetGroup?.name).toBe(specialName);
  });

  test('should handle negative sortIndex', async ({ api }) => {
    const { data } = await api.admin.mutation('facet-api/FacetGroupCreate', {
      variables: {
        input: { name: 'Negative Index Group', sortIndex: -5 },
      },
    });

    const result = data.catalogMutation.facetGroupCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.facetGroup?.sortIndex).toBe(-5);
  });

  test('should return null for non-existent group ID in query', async ({ api }) => {
    const { data } = await api.admin.query('facet-api/FacetGroup', {
      variables: { id: 'non-existent-id' },
    });

    expect(data.catalogQuery.facetGroup).toBeNull();
  });
});
