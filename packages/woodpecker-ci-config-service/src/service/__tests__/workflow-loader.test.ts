import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WorkflowScriptLoader } from '../workflow-loader';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('WorkflowScriptLoader', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-loader-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create loader with default directory', () => {
    const loader = new WorkflowScriptLoader();
    expect(loader).toBeDefined();
  });

  it('should create loader with custom directory', () => {
    const loader = new WorkflowScriptLoader('/custom/path');
    expect(loader).toBeDefined();
  });

  it('should return empty array when workflows directory does not exist', async () => {
    const nonExistentDir = path.join(tempDir, 'non-existent');
    const loader = new WorkflowScriptLoader(nonExistentDir);

    const result = await loader.load();
    expect(result).toEqual([]);
  });

  it('should return empty array when workflows directory is empty', async () => {
    const emptyDir = path.join(tempDir, 'empty');
    fs.mkdirSync(emptyDir);

    const loader = new WorkflowScriptLoader(emptyDir);
    const result = await loader.load();

    expect(result).toEqual([]);
  });

  it('should load workflow from .workflow.js file', async () => {
    const workflowContent = `
      export default {
        getName() { return 'test-workflow'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'test.workflow.js'), workflowContent);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(1);
    expect(result[0].getName()).toBe('test-workflow');
  });

  it('should load workflow from .workflow.ts file', async () => {
    const workflowContent = `
      export default {
        getName() { return 'typescript-workflow'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'test.workflow.ts'), workflowContent);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(1);
    expect(result[0].getName()).toBe('typescript-workflow');
  });

  it('should load multiple workflows from directory', async () => {
    const workflow1 = `
      export default {
        getName() { return 'workflow-1'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflow2 = `
      export default {
        getName() { return 'workflow-2'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'workflow1.workflow.js'), workflow1);
    fs.writeFileSync(path.join(workflowDir, 'workflow2.workflow.js'), workflow2);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(2);
    const names = result.map((w) => w.getName()).sort();
    expect(names).toEqual(['workflow-1', 'workflow-2']);
  });

  it('should recursively find workflows in subdirectories', async () => {
    const workflow = `
      export default {
        getName() { return 'nested-workflow'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    const subDir = path.join(workflowDir, 'sub', 'nested');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'nested.workflow.js'), workflow);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(1);
    expect(result[0].getName()).toBe('nested-workflow');
  });

  it('should load named exports', async () => {
    const workflowContent = `
      export const workflow1 = {
        getName() { return 'named-export-1'; },
        supports() { return true; },
        async build() { return []; }
      };

      export const workflow2 = {
        getName() { return 'named-export-2'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'named.workflow.js'), workflowContent);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(2);
    const names = result.map((w) => w.getName()).sort();
    expect(names).toEqual(['named-export-1', 'named-export-2']);
  });

  it('should load both default and named exports', async () => {
    const workflowContent = `
      export default {
        getName() { return 'default-export'; },
        supports() { return true; },
        async build() { return []; }
      };

      export const namedWorkflow = {
        getName() { return 'named-export'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'mixed.workflow.js'), workflowContent);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(2);
    const names = result.map((w) => w.getName()).sort();
    expect(names).toEqual(['default-export', 'named-export']);
  });

  it('should ignore non-workflow files', async () => {
    const workflow = `
      export default {
        getName() { return 'valid-workflow'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const regularFile = `
      export const notAWorkflow = { foo: 'bar' };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'valid.workflow.js'), workflow);
    fs.writeFileSync(path.join(workflowDir, 'regular.js'), regularFile);
    fs.writeFileSync(path.join(workflowDir, 'data.json'), '{}');

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(1);
    expect(result[0].getName()).toBe('valid-workflow');
  });

  it('should handle files with invalid workflow exports gracefully', async () => {
    const invalidWorkflow = `
      export default {
        notAWorkflowMethod() { return 'invalid'; }
      };
    `;

    const validWorkflow = `
      export default {
        getName() { return 'valid'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'invalid.workflow.js'), invalidWorkflow);
    fs.writeFileSync(path.join(workflowDir, 'valid.workflow.js'), validWorkflow);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(1);
    expect(result[0].getName()).toBe('valid');
  });

  it('should handle syntax errors in workflow files gracefully', async () => {
    const invalidSyntax = 'export default { invalid syntax !!!';

    const validWorkflow = `
      export default {
        getName() { return 'valid'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'syntax-error.workflow.js'), invalidSyntax);
    fs.writeFileSync(path.join(workflowDir, 'valid.workflow.js'), validWorkflow);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(1);
    expect(result[0].getName()).toBe('valid');
  });

  it('should handle absolute paths', async () => {
    const workflow = `
      export default {
        getName() { return 'absolute-path-workflow'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'test.workflow.js'), workflow);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(1);
    expect(result[0].getName()).toBe('absolute-path-workflow');
  });

  it('should handle class-based workflows', async () => {
    const workflowContent = `
      export default class TestWorkflow {
        getName() { return 'class-workflow'; }
        supports() { return true; }
        async build() { return []; }
      }
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'class.workflow.js'), workflowContent);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(1);
    expect(result[0].getName()).toBe('class-workflow');
  });

  it('should handle mixed file types', async () => {
    const jsWorkflow = `
      export default {
        getName() { return 'js-workflow'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const tsWorkflow = `
      export default {
        getName() { return 'ts-workflow'; },
        supports() { return true; },
        async build() { return []; }
      };
    `;

    const workflowDir = path.join(tempDir, 'workflows');
    fs.mkdirSync(workflowDir);
    fs.writeFileSync(path.join(workflowDir, 'test.workflow.js'), jsWorkflow);
    fs.writeFileSync(path.join(workflowDir, 'test.workflow.ts'), tsWorkflow);

    const loader = new WorkflowScriptLoader(workflowDir);
    const result = await loader.load();

    expect(result).toHaveLength(2);
    const names = result.map((w) => w.getName()).sort();
    expect(names).toEqual(['js-workflow', 'ts-workflow']);
  });
});
