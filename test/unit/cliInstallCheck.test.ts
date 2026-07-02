import * as assert from 'assert';
import { checkCliInstalled } from '../../src/util/cliInstallCheck';
import { ExecFn } from '../../src/cli/cliRunner';

suite('checkCliInstalled', () => {
  test('resolves true when sf --version succeeds', async () => {
    const execFn: ExecFn = (_command, _options, callback) => callback(null, '@salesforce/cli/2.0.0', '');
    assert.strictEqual(await checkCliInstalled(execFn), true);
  });

  test('resolves false when sf --version fails', async () => {
    const execFn: ExecFn = (_command, _options, callback) =>
      callback(new Error('not found'), '', 'command not found');
    assert.strictEqual(await checkCliInstalled(execFn), false);
  });
});
