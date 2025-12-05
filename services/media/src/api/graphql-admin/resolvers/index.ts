import type { Resolvers } from "../generated/types.js";

export const resolvers: Resolvers = {
  Query: {
    mediaQuery: () => ({}),
  },

  Mutation: {
    mediaMutation: () => ({}),
  },

  MediaQuery: {
    node: async (_parent, { id }, _ctx) => {
      throw new Error("Not implemented");
    },
    nodes: async (_parent, { ids }, _ctx) => {
      throw new Error("Not implemented");
    },
    file: async (_parent, { id }, _ctx) => {
      // Simple mock return for testing
      return {
        id,
        provider: "S3",
        url: `https://cdn.example.com/files/${id}`,
        mimeType: "image/png",
        ext: "png",
        sizeBytes: "1024",
        originalName: "test-file.png",
        width: 800,
        height: 600,
        durationMs: null,
        altText: "Test file",
        sourceUrl: null,
        isProcessed: true,
        meta: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
    },
    files: async (_parent, args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  MediaMutation: {
    fileUpload: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    fileUploadFromUrl: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    fileCreateExternal: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    fileUpdate: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    fileDelete: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  // Federation entity
  File: {
    __resolveReference: async (reference, _ctx) => {
      throw new Error("Not implemented");
    },
    dimensions: (parent, _args, _ctx) => {
      if (parent.width && parent.height) {
        return { width: parent.width, height: parent.height };
      }
      return null;
    },
    s3Data: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
    externalData: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  // Interface resolvers
  Node: {
    __resolveType: (obj) => {
      if ("provider" in obj) return "File";
      return null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
