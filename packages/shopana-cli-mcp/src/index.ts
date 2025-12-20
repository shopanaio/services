#!/usr/bin/env node

import { MCPServer } from 'mcp-framework';

const server = new MCPServer({
  name: 'shopana-cli-mcp-server',
  version: '1.0.0'
});

await server.start();
