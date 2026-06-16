import { MCPResource, ResourceContent } from 'mcp-framework';
import { readFile } from 'fs/promises';
import { join } from 'path';

class WorkflowArchitectureResource extends MCPResource {
  uri = 'docs://shopana/workflow-idempotency-framework/architecture';
  name = 'Workflow Idempotency Framework Architecture';
  description = `Comprehensive documentation for Shopana's durable workflows, sagas, and event dispatch system.

Covers:
- DBOS workflow/saga/step decorators and execution
- Idempotency strategies (client, workflow, content)
- Event dispatch and handler patterns
- Compensation and rollback mechanisms
- Step cancellation with AbortSignal
- Error handling and DLQ
- Database schema and data model`;
  mimeType = 'text/markdown';

  async read(): Promise<ResourceContent[]> {
    // Path relative to the services root (where MCP server is started)
    const docPath = join(process.cwd(), 'docs/workflow-idempotency-framework/architecture.md');

    try {
      const content = await readFile(docPath, 'utf-8');
      return [
        {
          uri: this.uri,
          mimeType: this.mimeType,
          text: content
        }
      ];
    } catch (error) {
      return [
        {
          uri: this.uri,
          mimeType: 'text/plain',
          text: `Error reading documentation: ${error instanceof Error ? error.message : 'Unknown error'}\n\nExpected path: ${docPath}`
        }
      ];
    }
  }
}

export default WorkflowArchitectureResource;
