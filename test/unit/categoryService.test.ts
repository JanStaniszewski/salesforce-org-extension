import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CategoryService } from '../../src/services/categoryService';

suite('CategoryService', () => {
  let tempFile: string;

  setup(() => {
    tempFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sf-org-manager-')), 'categories.json');
  });

  teardown(() => {
    fs.rmSync(path.dirname(tempFile), { recursive: true, force: true });
  });

  test('getCategory returns undefined when no file exists yet', () => {
    const service = new CategoryService(tempFile);
    assert.strictEqual(service.getCategory('user@example.com'), undefined);
  });

  test('assignCategory persists to disk and is readable by a new instance', () => {
    const service = new CategoryService(tempFile);
    service.assignCategory('user@example.com', 'ProjektX');

    const reloaded = new CategoryService(tempFile);
    assert.strictEqual(reloaded.getCategory('user@example.com'), 'ProjektX');
  });

  test('removeCategory clears the assignment', () => {
    const service = new CategoryService(tempFile);
    service.assignCategory('user@example.com', 'ProjektX');
    service.removeCategory('user@example.com');

    assert.strictEqual(service.getCategory('user@example.com'), undefined);
  });

  test('listCategories returns unique sorted category names', () => {
    const service = new CategoryService(tempFile);
    service.assignCategory('a@example.com', 'ProjektB');
    service.assignCategory('b@example.com', 'ProjektA');
    service.assignCategory('c@example.com', 'ProjektB');

    assert.deepStrictEqual(service.listCategories(), ['ProjektA', 'ProjektB']);
  });
});
