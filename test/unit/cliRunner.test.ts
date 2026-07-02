import * as assert from 'assert';
import { runCliJson, runCli, CliError, ExecFn } from '../../src/cli/cliRunner';

function fakeExec(stdout: string, stderr = '', error: Error | null = null): ExecFn {
  return (_command, _options, callback) => {
    callback(error, stdout, stderr);
  };
}

suite('cliRunner', () => {
  test('runCliJson resolves with parsed result on success', async () => {
    const exec = fakeExec(JSON.stringify({ status: 0, result: { foo: 'bar' } }));
    const result = await runCliJson<{ foo: string }>('sf org list --json', exec);
    assert.strictEqual(result.foo, 'bar');
  });

  test('runCliJson rejects with CliError when status is non-zero', async () => {
    const exec = fakeExec(JSON.stringify({ status: 1, message: 'boom' }));
    await assert.rejects(
      () => runCliJson('sf org list --json', exec),
      (err: unknown) => err instanceof CliError && err.message === 'boom'
    );
  });

  test('runCliJson rejects with CliError when stdout is not valid JSON', async () => {
    const exec = fakeExec('not json', 'some stderr', new Error('exec failed'));
    await assert.rejects(
      () => runCliJson('sf org list --json', exec),
      (err: unknown) => err instanceof CliError
    );
  });

  test('runCli resolves with raw stdout', async () => {
    const exec = fakeExec('plain output');
    const result = await runCli('sf --version', exec);
    assert.strictEqual(result, 'plain output');
  });

  test('runCli rejects with CliError on exec error', async () => {
    const exec = fakeExec('', 'some stderr', new Error('exec failed'));
    await assert.rejects(
      () => runCli('sf --version', exec),
      (err: unknown) => err instanceof CliError
    );
  });
});
