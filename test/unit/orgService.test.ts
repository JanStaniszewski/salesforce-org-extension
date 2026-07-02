import * as assert from 'assert';
import { OrgService } from '../../src/services/orgService';
import { ExecFn } from '../../src/cli/cliRunner';

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
    const commands: string[] = [];
    const execFn: ExecFn = (command, _options, callback) => {
      commands.push(command);
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn);

    await service.listOrgs();
    await service.loginWeb('newalias', 'https://login.salesforce.com');
    await service.listOrgs();

    const listCalls = commands.filter((c) => c.startsWith('sf org list')).length;
    assert.strictEqual(listCalls, 2, 'org list should be re-fetched after loginWeb');
  });

  test('loginWeb rejects an alias containing shell metacharacters', async () => {
    const execFn: ExecFn = (_command, _options, callback) => {
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn);

    await assert.rejects(() => service.loginWeb('foo; rm -rf ~', 'https://login.salesforce.com'));
  });

  test('loginWeb rejects an instance URL containing shell metacharacters', async () => {
    const execFn: ExecFn = (_command, _options, callback) => {
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn);

    await assert.rejects(() => service.loginWeb('safealias', 'https://evil.com`rm -rf ~`'));
  });

  test('loginWeb accepts a normal alias and instance URL', async () => {
    let called = false;
    const execFn: ExecFn = (_command, _options, callback) => {
      called = true;
      callback(null, JSON.stringify({ status: 0, result: {} }), '');
    };
    const service = new OrgService(execFn);

    await service.loginWeb('my-alias_1', 'https://mydomain.my.salesforce.com');

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
});
