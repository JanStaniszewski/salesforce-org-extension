import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { OrgService } from '../../src/services/orgService';
import { ExecFn, ExecFileFn } from '../../src/cli/cliRunner';

function successExecFileFn(): ExecFileFn {
  return (_file, _args, _options, callback) => {
    callback(null, JSON.stringify({ status: 0, result: {} }), '');
  };
}

suite('OrgService', () => {
  test('listOrgs parses and caches the org list', async () => {
    let callCount = 0;
    const execFn: ExecFn = (_command, _options, callback) => {
      callCount++;
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            nonScratchOrgs: [
              {
                username: 'user@example.com',
                alias: 'myorg',
                connectedStatus: 'Connected',
                isDevHub: false,
                isSandbox: false,
                isDefaultUsername: true,
              },
            ],
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    const first = await service.listOrgs();
    const second = await service.listOrgs();

    assert.strictEqual(first.length, 1);
    assert.strictEqual(first[0].alias, 'myorg');
    assert.strictEqual(second, first, 'second call should return the cached array');
    assert.strictEqual(callCount, 1, 'CLI should only be invoked once due to caching');
  });

  test('listOrgs bypasses cache when forceRefresh is true', async () => {
    let callCount = 0;
    const execFn: ExecFn = (_command, _options, callback) => {
      callCount++;
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn);

    await service.listOrgs();
    await service.listOrgs(true);

    assert.strictEqual(callCount, 2);
  });

  test('getOrgDetails caches details per username', async () => {
    let callCount = 0;
    const execFn: ExecFn = (_command, _options, callback) => {
      callCount++;
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            id: '00Dxx0000000000EAA',
            apiVersion: '61.0',
            instanceUrl: 'https://myorg.my.salesforce.com',
            username: 'user@example.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    const details = await service.getOrgDetails('user@example.com');
    await service.getOrgDetails('user@example.com');

    assert.strictEqual(details.orgId, '00Dxx0000000000EAA');
    assert.strictEqual(callCount, 1);
  });

  test('loginWeb invalidates the org list cache', async () => {
    const listCalls: string[] = [];
    const execFn: ExecFn = (command, _options, callback) => {
      if (command.startsWith('sf org list')) {
        listCalls.push(command);
      }
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn, successExecFileFn());

    await service.listOrgs();
    await service.loginWeb('newalias', 'https://login.salesforce.com');
    await service.listOrgs();

    assert.strictEqual(listCalls.length, 2, 'org list should be re-fetched after loginWeb');
  });

  test('loginWeb passes alias and instance URL as separate argv entries', async () => {
    let receivedArgs: string[] = [];
    const execFileFn: ExecFileFn = (file, args, _options, callback) => {
      receivedArgs = args;
      assert.strictEqual(file, 'sf');
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(undefined, execFileFn);

    await service.loginWeb('RMPP CI1', 'https://login.salesforce.com');

    assert.deepStrictEqual(receivedArgs, [
      'org',
      'login',
      'web',
      '--instance-url',
      'https://login.salesforce.com',
      '--json',
      '--alias',
      'RMPP CI1',
    ]);
  });

  test('loginWeb forwards the abort signal to execFile', async () => {
    let receivedSignal: AbortSignal | undefined;
    const execFileFn: ExecFileFn = (_file, _args, options, callback) => {
      receivedSignal = options.signal;
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(undefined, execFileFn);
    const controller = new AbortController();

    await service.loginWeb('safealias', 'https://login.salesforce.com', controller.signal);

    assert.strictEqual(receivedSignal, controller.signal);
  });

  test('loginWeb rejects an alias starting with a hyphen', async () => {
    const service = new OrgService(undefined, successExecFileFn());

    await assert.rejects(() => service.loginWeb('-alias', 'https://login.salesforce.com'));
  });

  test('loginWeb rejects an alias containing control characters', async () => {
    const service = new OrgService(undefined, successExecFileFn());

    await assert.rejects(() => service.loginWeb('foo\nbar', 'https://login.salesforce.com'));
  });

  test('loginWeb rejects an alias with leading/trailing whitespace', async () => {
    const service = new OrgService(undefined, successExecFileFn());

    await assert.rejects(() => service.loginWeb('  padded  ', 'https://login.salesforce.com'));
  });

  test('loginWeb rejects an instance URL containing shell metacharacters', async () => {
    const service = new OrgService(undefined, successExecFileFn());

    await assert.rejects(() => service.loginWeb('safealias', 'https://evil.com`rm -rf ~`'));
  });

  test('loginWeb accepts an alias with spaces since execFile bypasses the shell', async () => {
    let called = false;
    const execFileFn: ExecFileFn = (_file, _args, _options, callback) => {
      called = true;
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(undefined, execFileFn);

    await service.loginWeb('RMPP CI1', 'https://mydomain.my.salesforce.com');

    assert.strictEqual(called, true);
  });

  test('logout invalidates both the org list and details cache', async () => {
    let detailCalls = 0;
    const execFn: ExecFn = (command, _options, callback) => {
      if (command.startsWith('sf org display')) {
        detailCalls++;
      }
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            id: 'x',
            apiVersion: '61.0',
            instanceUrl: 'x',
            username: 'user@example.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    await service.getOrgDetails('user@example.com');
    await service.logout('user@example.com');
    await service.getOrgDetails('user@example.com');

    assert.strictEqual(detailCalls, 2, 'details should be re-fetched after logout clears the cache');
  });

  test('getAuthUrl returns the sfdxAuthUrl from the dedicated show-sfdx-auth-url command', async () => {
    const commands: string[] = [];
    const execFn: ExecFn = (command, _options, callback) => {
      commands.push(command);
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            sfdxAuthUrl: 'force://PlatformCLI::refreshtoken@myorg.my.salesforce.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    const authUrl = await service.getAuthUrl('user@example.com');

    assert.strictEqual(authUrl, 'force://PlatformCLI::refreshtoken@myorg.my.salesforce.com');
    assert.ok(commands[0].includes('org auth show-sfdx-auth-url'), 'should call the dedicated auth-url command');
  });

  test('getAuthUrl throws when the CLI response has no sfdxAuthUrl', async () => {
    const execFn: ExecFn = (_command, _options, callback) => {
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn);

    await assert.rejects(() => service.getAuthUrl('user@example.com'));
  });

  test('getAuthUrl throws when the CLI redacts the auth URL instead of returning it', async () => {
    const execFn: ExecFn = (_command, _options, callback) => {
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            sfdxAuthUrl: "[REDACTED] Use 'sf org auth show-sfdx-auth-url' to view",
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    await assert.rejects(() => service.getAuthUrl('user@example.com'));
  });

  test('getAuthUrl never caches - two calls invoke the CLI twice', async () => {
    let callCount = 0;
    const execFn: ExecFn = (_command, _options, callback) => {
      callCount++;
      callback(
        null,
        JSON.stringify({
          status: 0,
          result: {
            sfdxAuthUrl: 'force://PlatformCLI::refreshtoken@myorg.my.salesforce.com',
          },
        }),
        ''
      );
    };
    const service = new OrgService(execFn);

    await service.getAuthUrl('user@example.com');
    await service.getAuthUrl('user@example.com');

    assert.strictEqual(callCount, 2, 'getAuthUrl should never cache — it should call the CLI every time');
  });

  suite('setDefault', () => {
    let tempDir: string;

    setup(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sf-org-manager-'));
    });

    teardown(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('sets only the global config when the workspace has no sfdx project', async () => {
      const commands: string[] = [];
      const execFn: ExecFn = (command, _options, callback) => {
        commands.push(command);
        callback(null, JSON.stringify({ status: 0, result: {} }), '');
      };
      const service = new OrgService(execFn, undefined, tempDir);

      await service.setDefault('user@example.com');

      assert.deepStrictEqual(commands, ['sf config set target-org=user@example.com --global']);
    });

    test('also sets the local config when the workspace is an sfdx project, since local overrides global', async () => {
      fs.writeFileSync(path.join(tempDir, 'sfdx-project.json'), '{}');
      const commands: string[] = [];
      const execFn: ExecFn = (command, _options, callback) => {
        commands.push(command);
        callback(null, JSON.stringify({ status: 0, result: {} }), '');
      };
      const service = new OrgService(execFn, undefined, tempDir);

      await service.setDefault('user@example.com');

      assert.deepStrictEqual(commands, [
        'sf config set target-org=user@example.com',
        'sf config set target-org=user@example.com --global',
      ]);
    });

    test('runs both config set calls in the workspace cwd', async () => {
      fs.writeFileSync(path.join(tempDir, 'sfdx-project.json'), '{}');
      const receivedCwds: (string | undefined)[] = [];
      const execFn: ExecFn = (_command, options, callback) => {
        receivedCwds.push(options.cwd);
        callback(null, JSON.stringify({ status: 0, result: {} }), '');
      };
      const service = new OrgService(execFn, undefined, tempDir);

      await service.setDefault('user@example.com');

      assert.deepStrictEqual(receivedCwds, [tempDir, tempDir]);
    });

    test('invalidates the org list cache', async () => {
      const listCalls: string[] = [];
      const execFn: ExecFn = (command, _options, callback) => {
        if (command.startsWith('sf org list')) {
          listCalls.push(command);
        }
        callback(null, JSON.stringify({ status: 0, result: {} }), '');
      };
      const service = new OrgService(execFn, undefined, tempDir);

      await service.listOrgs();
      await service.setDefault('user@example.com');
      await service.listOrgs();

      assert.strictEqual(listCalls.length, 2, 'org list should be re-fetched after setDefault');
    });
  });
});
